const test = require("node:test");
const assert = require("node:assert/strict");
const { io: createClient } = require("socket.io-client");
const { createGameServer } = require("../server");
const { RESOLUTION_DELAY_MS, generateRoomCode } = require("../src/server/roomManager");

function waitForEvent(socket, event, predicate = () => true, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}.`));
    }, timeoutMs);

    function onEvent(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, onEvent);
      resolve(payload);
    }

    socket.on(event, onEvent);
  });
}

function emitWithAck(socket, event, ...args) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out.`)), 3000);
    socket.emit(event, ...args, response => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

async function createFixture(t, options = {}) {
  const game = createGameServer({
    roomManagerOptions: {
      resolutionDelayMs: 25,
      combatRandom: () => 0.5,
      ...options.roomManagerOptions
    }
  });
  const sockets = [];

  await new Promise((resolve, reject) => {
    game.server.once("error", reject);
    game.server.listen(0, "127.0.0.1", resolve);
  });
  const address = game.server.address();
  const url = `http://127.0.0.1:${address.port}`;

  async function connect() {
    const socket = createClient(url, {
      forceNew: true,
      reconnection: false,
      timeout: 3000,
      transports: ["websocket"]
    });
    sockets.push(socket);
    await waitForEvent(socket, "connect");
    return socket;
  }

  t.after(async () => {
    sockets.forEach(socket => socket.disconnect());
    await new Promise(resolve => game.io.close(resolve));
  });

  return { game, connect };
}

async function join(socket, code) {
  return emitWithAck(socket, "join", code);
}

async function submitRound(a, b, moveA, moveB, round) {
  const resolvedA = waitForEvent(a, "state",
    state => state.phase === "RESOLVING" && state.round === round);
  const resolvedB = waitForEvent(b, "state",
    state => state.phase === "RESOLVING" && state.round === round);
  const firstMove = await emitWithAck(a, "move", moveA);
  const secondMove = await emitWithAck(b, "move", moveB);
  assert.deepEqual(firstMove, { ok: true });
  assert.deepEqual(secondMove, { ok: true });
  await Promise.all([resolvedA, resolvedB]);
  return Promise.all([
    waitForEvent(a, "state", state => state.phase === "SELECT" && state.round === round + 1),
    waitForEvent(b, "state", state => state.phase === "SELECT" && state.round === round + 1)
  ]);
}

test("room joins assign indexes, generate codes, and reject invalid or full rooms", async t => {
  const { connect } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  const third = await connect();
  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");

  const created = await join(first);
  assert.match(created.code, /^[A-Z]{4}$/);

  const joined = await join(second, created.code.toLowerCase());
  assert.deepEqual(joined, { code: created.code });
  const [firstState, secondState] = await Promise.all([firstSelect, secondSelect]);
  assert.equal(firstState.you, 0);
  assert.equal(secondState.you, 1);

  assert.match((await join(third, created.code)).error, /full/i);
  assert.match((await join(third, "ABC")).error, /4-letter/i);
  assert.match((await join(first, "NEXT")).error, /already in a room/i);
  assert.equal(joined.code, created.code);
  assert.equal((await join(third, "1234")).error !== undefined, true);
});

test("characters synchronize, lock at match start, and persist through a rematch", async t => {
  const { connect, game } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  const knight = {
    code: "CAST",
    characterId: "knight",
    cosmetics: { accentColor: "azure", headgear: "winged-helm", accessory: "cape" }
  };
  const mage = {
    code: "CAST",
    characterId: "mage",
    cosmetics: { accentColor: "violet", headgear: "hood", accessory: "floating-orb" }
  };

  const firstWaiting = waitForEvent(first, "state", state => state.phase === "WAITING");
  assert.deepEqual(await join(first, knight), { code: "CAST" });
  const firstInitial = await firstWaiting;
  assert.equal(firstInitial.players[0].characterId, "knight");
  assert.deepEqual(firstInitial.players[0].cosmetics, knight.cosmetics);

  const invalidClaim = await emitWithAck(first, "configure", {
    characterId: "assassin",
    cosmetics: { accentColor: "ember", headgear: "deep-hood", accessory: "none" },
    playerIndex: 1
  });
  assert.match(invalidClaim.error, /unsupported fields/i);

  const ownConfiguration = waitForEvent(first, "state",
    state => state.phase === "WAITING" && state.players[0].characterId === "assassin");
  const changed = await emitWithAck(first, "configure", {
    characterId: "assassin",
    cosmetics: { accentColor: "jade", headgear: "deep-hood", accessory: "neck-wrap" }
  });
  assert.deepEqual(changed, { ok: true });
  const changedState = await ownConfiguration;
  assert.equal(changedState.players.length, 1);
  assert.equal(changedState.players[0].characterId, "assassin");

  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");
  assert.deepEqual(await join(second, mage), { code: "CAST" });
  const [firstState, secondState] = await Promise.all([firstSelect, secondSelect]);
  assert.equal(firstState.you, 0);
  assert.equal(secondState.you, 1);
  assert.equal(firstState.players[0].characterId, "assassin");
  assert.equal(firstState.players[1].characterId, "mage");
  assert.equal(secondState.players[0].characterId, "assassin");
  assert.equal(secondState.players[1].characterId, "mage");
  assert.deepEqual(firstState.players[1].cosmetics, mage.cosmetics);
  assert.deepEqual(secondState.players[0].cosmetics, changedState.players[0].cosmetics);

  const lockedConfiguration = await emitWithAck(first, "configure", {
    characterId: "brute",
    cosmetics: { accentColor: "gold", headgear: "iron-cap", accessory: "fur-mantle" }
  });
  assert.match(lockedConfiguration.error, /locked/i);
  assert.equal(game.roomManager.rooms.get("CAST").players[0].characterId, "assassin");

  const room = game.roomManager.rooms.get("CAST");
  room.players.forEach(player => { player.hp = 1; });
  const firstOver = waitForEvent(first, "state", state => state.phase === "GAME_OVER");
  const secondOver = waitForEvent(second, "state", state => state.phase === "GAME_OVER");
  await emitWithAck(first, "move", "Attack");
  await emitWithAck(second, "move", "Attack");
  await Promise.all([firstOver, secondOver]);

  const firstReset = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondReset = waitForEvent(second, "state", state => state.phase === "SELECT");
  await emitWithAck(first, "rematch");
  await emitWithAck(second, "rematch");
  const [afterRematchFirst, afterRematchSecond] =
    await Promise.all([firstReset, secondReset]);
  for (const state of [afterRematchFirst, afterRematchSecond]) {
    assert.equal(state.players[0].characterId, "assassin");
    assert.equal(state.players[1].characterId, "mage");
    assert.deepEqual(state.players[0].cosmetics, changedState.players[0].cosmetics);
    assert.deepEqual(state.players[1].cosmetics, mage.cosmetics);
  }
});

test("room codes avoid active collisions and join attempts are throttled per socket", async t => {
  const values = [0, 0, 0, 0, 1, 1, 1, 1];
  let valueIndex = 0;
  assert.equal(generateRoomCode(new Map([["AAAA", {}]]), () => values[valueIndex++]), "BBBB");

  let clock = 0;
  const { connect } = await createFixture(t, {
    roomManagerOptions: {
      now: () => clock,
      joinAttemptLimit: 2,
      joinAttemptWindowMs: 1000
    }
  });
  const socket = await connect();
  assert.match((await join(socket, "bad")).error, /4-letter/i);
  assert.match((await join(socket, "also-bad")).error, /4-letter/i);
  assert.match((await join(socket, "RATE")).error, /too many join attempts/i);

  clock = 1001;
  assert.deepEqual(await join(socket, "RATE"), { code: "RATE" });
});

test("moves are validated, private until resolution, and phase-gated", async t => {
  const { connect } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  const outsider = await connect();
  const created = await join(first, "PRIV");
  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");
  await join(second, created.code);
  await Promise.all([firstSelect, secondSelect]);

  const lockedFirst = waitForEvent(first, "state",
    state => state.phase === "SELECT" && state.players[0].locked);
  const lockedSecond = waitForEvent(second, "state",
    state => state.phase === "SELECT" && state.players[0].locked);
  assert.deepEqual(await emitWithAck(first, "move", "Attack"), { ok: true });
  const [firstPrivateState, secondPrivateState] = await Promise.all([lockedFirst, lockedSecond]);

  for (const state of [firstPrivateState, secondPrivateState]) {
    assert.equal(state.players[0].locked, true);
    assert.equal(state.players[1].locked, false);
    assert.equal(state.result, null);
    assert.equal(Object.hasOwn(state.players[0], "move"), false);
    assert.equal(Object.hasOwn(state.players[1], "move"), false);
  }
  assert.match((await emitWithAck(first, "move", "Defend")).error, /already submitted/i);
  assert.match((await emitWithAck(second, "move", "Magic")).error, /invalid move/i);
  assert.match((await emitWithAck(second, "move", { move: "Defend", playerIndex: 0 })).error,
    /invalid move/i);
  assert.match((await emitWithAck(outsider, "move", "Attack")).error, /not in an active room/i);

  const resolvedFirst = waitForEvent(first, "state", state => state.phase === "RESOLVING");
  const resolvedSecond = waitForEvent(second, "state", state => state.phase === "RESOLVING");
  assert.deepEqual(await emitWithAck(second, "move", "Defend"), { ok: true });
  const [firstResult, secondResult] = await Promise.all([resolvedFirst, resolvedSecond]);
  assert.deepEqual(firstResult.result.moves, ["Attack", "Defend"]);
  assert.deepEqual(secondResult.result.moves, ["Attack", "Defend"]);
  assert.deepEqual(firstResult.result.damage, [0, 5]);
  assert.match((await emitWithAck(first, "move", "Attack")).error, /selection/i);

  const [firstNext, secondNext] = await Promise.all([
    waitForEvent(first, "state", state => state.phase === "SELECT" && state.round === 2),
    waitForEvent(second, "state", state => state.phase === "SELECT" && state.round === 2)
  ]);
  assert.equal(firstNext.round, secondNext.round);
});

test("Special cooldown blocks reuse and decrements over three non-Special rounds", async t => {
  const { connect } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  const created = await join(first, "COOL");
  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");
  await join(second, created.code);
  await Promise.all([firstSelect, secondSelect]);

  const [firstState] = await submitRound(first, second, "Special", "Defend", 1);
  assert.equal(firstState.players[0].cooldown, 3);
  assert.match((await emitWithAck(first, "move", "Special")).error, /cooldown/i);

  const [afterOne] = await submitRound(first, second, "Attack", "Defend", 2);
  assert.equal(afterOne.players[0].cooldown, 2);
  const [afterTwo] = await submitRound(first, second, "Attack", "Defend", 3);
  assert.equal(afterTwo.players[0].cooldown, 1);
  const [afterThree] = await submitRound(first, second, "Attack", "Defend", 4);
  assert.equal(afterThree.players[0].cooldown, 0);
});

test("game-over result survives one rematch vote and both votes reset the duel", async t => {
  const { connect, game } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  const created = await join(first, "RMTC");
  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");
  await join(second, created.code);
  await Promise.all([firstSelect, secondSelect]);

  const room = game.roomManager.rooms.get(created.code);
  room.players.forEach(player => { player.hp = 1; });

  const gameOverFirst = waitForEvent(first, "state", state => state.phase === "GAME_OVER");
  const gameOverSecond = waitForEvent(second, "state", state => state.phase === "GAME_OVER");
  await emitWithAck(first, "move", "Attack");
  await emitWithAck(second, "move", "Attack");
  const [firstFinal, secondFinal] = await Promise.all([gameOverFirst, gameOverSecond]);
  assert.equal(firstFinal.result.winner, -1);
  assert.equal(secondFinal.result.winner, -1);

  assert.match((await emitWithAck(first, "move", "Attack")).error, /selection/i);
  const oneVoteFirst = waitForEvent(first, "state",
    state => state.phase === "GAME_OVER" && state.rematchVotes === 1);
  const oneVoteSecond = waitForEvent(second, "state",
    state => state.phase === "GAME_OVER" && state.rematchVotes === 1);
  assert.deepEqual(await emitWithAck(first, "rematch"), { ok: true });
  const [votedFirst, votedSecond] = await Promise.all([oneVoteFirst, oneVoteSecond]);
  assert.equal(votedFirst.round, 1);
  assert.equal(votedSecond.round, 1);
  assert.equal(votedFirst.result.winner, -1);
  assert.equal(votedSecond.result.winner, -1);
  assert.equal(votedFirst.youRematchReady, true);
  assert.equal(votedSecond.youRematchReady, false);

  const resetFirst = waitForEvent(first, "state", state => state.phase === "SELECT");
  const resetSecond = waitForEvent(second, "state", state => state.phase === "SELECT");
  assert.deepEqual(await emitWithAck(second, "rematch"), { ok: true });
  const [firstReset, secondReset] = await Promise.all([resetFirst, resetSecond]);
  for (const state of [firstReset, secondReset]) {
    assert.equal(state.round, 1);
    assert.equal(state.players[0].hp, 100);
    assert.equal(state.players[1].hp, 100);
    assert.equal(state.result, null);
    assert.equal(state.rematchVotes, 0);
  }
});

test("disconnect removes the room and stale resolution timers cannot publish", async t => {
  const scheduled = [];
  const { connect, game } = await createFixture(t, {
    roomManagerOptions: {
      resolutionDelayMs: undefined,
      schedule(callback, delay) {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      cancel() {}
    }
  });
  const first = await connect();
  const second = await connect();
  const created = await join(first, "STAL");
  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");
  await join(second, created.code);
  await Promise.all([firstSelect, secondSelect]);

  await emitWithAck(first, "move", "Attack");
  await emitWithAck(second, "move", "Defend");
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, RESOLUTION_DELAY_MS);

  const opponentLeft = waitForEvent(second, "opponentLeft");
  first.disconnect();
  await opponentLeft;
  assert.equal(game.roomManager.hasRoom(created.code), false);

  let stateCount = 0;
  second.on("state", () => { stateCount++; });
  scheduled[0].callback();
  assert.equal(stateCount, 0);
  assert.deepEqual(await join(second, "NEXT"), { code: "NEXT" });
});
