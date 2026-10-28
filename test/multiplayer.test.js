const test = require("node:test");
const assert = require("node:assert/strict");
const { io: createClient } = require("socket.io-client");
const { createGameServer } = require("../server");
const { RESOLUTION_DELAY_MS, generateRoomCode } = require("../src/server/roomManager");
const MAPS = require("../public/assets/maps/manifest.json").maps;

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

test("map manifest defines five distinct battlefields with bounded environmental effects", () => {
  assert.deepEqual(MAPS.map(map => map.id), [
    "forgotten-grove",
    "crimson-citadel",
    "moonlit-shrine",
    "ember-forge",
    "skybound-sanctuary"
  ]);
  assert.equal(new Set(MAPS.map(map => map.environment)).size, 5);
  for (const map of MAPS) {
    assert.ok(map.layers.length > 0);
    assert.ok(map.foreground.length > 0);
    assert.equal(map.fallback, "procedural-canvas");
    assert.ok(map.effects.count <= 24);
  }
});

async function createFixture(t, options = {}) {
  const game = createGameServer({
    roomManagerOptions: {
      resolutionDelayMs: 25,
      mapRevealDelayMs: 20,
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

async function joinAndStartMatch(first, second, rawCode,
  voteA = "forgotten-grove", voteB = voteA) {
  const firstVoting = waitForEvent(first, "state", state => state.phase === "MAP_VOTE");
  const secondVoting = waitForEvent(second, "state", state => state.phase === "MAP_VOTE");
  const joined = await join(second, rawCode);
  const mapVoteStates = await Promise.all([firstVoting, secondVoting]);
  const firstReveal = waitForEvent(first, "state", state => state.phase === "MAP_REVEAL");
  const secondReveal = waitForEvent(second, "state", state => state.phase === "MAP_REVEAL");
  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");
  const responses = await Promise.all([
    emitWithAck(first, "mapVote", voteA),
    emitWithAck(second, "mapVote", voteB)
  ]);
  assert.deepEqual(responses, [{ ok: true }, { ok: true }]);
  const revealStates = await Promise.all([firstReveal, secondReveal]);
  const selectStates = await Promise.all([firstSelect, secondSelect]);
  return { joined, mapVoteStates, revealStates, selectStates };
}

async function joinIntoMapVote(first, second, code) {
  const firstVoting = waitForEvent(first, "state", state => state.phase === "MAP_VOTE");
  const secondVoting = waitForEvent(second, "state", state => state.phase === "MAP_VOTE");
  await join(first, code);
  await join(second, code);
  return Promise.all([firstVoting, secondVoting]);
}

test("room joins assign indexes, generate codes, and reject invalid or full rooms", async t => {
  const { connect } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  const third = await connect();
  const firstVoting = waitForEvent(first, "state", state => state.phase === "MAP_VOTE");
  const secondVoting = waitForEvent(second, "state", state => state.phase === "MAP_VOTE");

  const created = await join(first);
  assert.match(created.code, /^[A-Z]{4}$/);

  const joined = await join(second, created.code.toLowerCase());
  assert.deepEqual(joined, { code: created.code });
  const [firstState, secondState] = await Promise.all([firstVoting, secondVoting]);
  assert.equal(firstState.you, 0);
  assert.equal(secondState.you, 1);
  assert.equal(firstState.phase, "MAP_VOTE");

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
    variantId: "knight-2"
  };
  const wizard = {
    code: "CAST",
    characterId: "wizard",
    variantId: "lightning-mage"
  };

  const firstWaiting = waitForEvent(first, "state", state => state.phase === "WAITING");
  assert.deepEqual(await join(first, knight), { code: "CAST" });
  const firstInitial = await firstWaiting;
  assert.equal(firstInitial.players[0].characterId, "knight");
  assert.equal(firstInitial.players[0].variantId, "knight-2");

  const invalidClaim = await emitWithAck(first, "configure", {
    characterId: "ninja",
    variantId: "ninja-monk",
    playerIndex: 1
  });
  assert.match(invalidClaim.error, /unsupported fields/i);

  assert.match((await emitWithAck(first, "configure", {
    characterId: "ninja",
    variantId: "samurai-archer"
  })).error, /variant/i);

  const ownConfiguration = waitForEvent(first, "state",
    state => state.phase === "WAITING" && state.players[0].characterId === "skeleton");
  const changed = await emitWithAck(first, "configure", {
    characterId: "skeleton",
    variantId: "skeleton-spearman"
  });
  assert.deepEqual(changed, { ok: true });
  const changedState = await ownConfiguration;
  assert.equal(changedState.players.length, 1);
  assert.equal(changedState.players[0].characterId, "skeleton");
  assert.equal(changedState.players[0].variantId, "skeleton-spearman");

  const { joined, selectStates } = await joinAndStartMatch(first, second, wizard);
  assert.deepEqual(joined, { code: "CAST" });
  const [firstState, secondState] = selectStates;
  assert.equal(firstState.you, 0);
  assert.equal(secondState.you, 1);
  assert.equal(firstState.players[0].characterId, "skeleton");
  assert.equal(firstState.players[0].variantId, "skeleton-spearman");
  assert.equal(firstState.players[1].characterId, "wizard");
  assert.equal(firstState.players[1].variantId, "lightning-mage");
  assert.equal(secondState.players[0].characterId, "skeleton");
  assert.equal(secondState.players[0].variantId, "skeleton-spearman");
  assert.equal(secondState.players[1].characterId, "wizard");
  assert.equal(secondState.players[1].variantId, "lightning-mage");
  assert.equal(Object.hasOwn(firstState.players[0], "cosmetics"), false);

  const lockedConfiguration = await emitWithAck(first, "configure", {
    characterId: "knight",
    variantId: "knight-3"
  });
  assert.match(lockedConfiguration.error, /locked/i);
  assert.equal(game.roomManager.rooms.get("CAST").players[0].characterId, "skeleton");
  assert.equal(game.roomManager.rooms.get("CAST").players[0].variantId, "skeleton-spearman");

  const room = game.roomManager.rooms.get("CAST");
  room.players.forEach(player => { player.hp = 1; });
  room.players.forEach(player => { player.cooldown = 2; });
  const selectedMap = room.mapId;
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
    assert.equal(state.players[0].characterId, "skeleton");
    assert.equal(state.players[0].variantId, "skeleton-spearman");
    assert.equal(state.players[1].characterId, "wizard");
    assert.equal(state.players[1].variantId, "lightning-mage");
    assert.equal(state.mapId, selectedMap);
    assert.equal(state.players[0].cooldown, 0);
    assert.equal(state.players[1].cooldown, 0);
    assert.deepEqual(state.mapVoteLocks, [false, false]);
  }
});

test("map votes are phase-gated, validated, single-use, and private until both lock", async t => {
  const { connect } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  const outsider = await connect();
  await join(first, "VOTE");

  assert.match((await emitWithAck(first, "mapVote", "forgotten-grove")).error, /map voting/i);
  const [firstVoting, secondVoting] = await joinIntoMapVote(first, second, "VOTE");
  assert.equal(firstVoting.phase, "MAP_VOTE");
  assert.deepEqual(firstVoting.mapVoteLocks, [false, false]);
  assert.equal(firstVoting.mapId, null);

  assert.match((await emitWithAck(outsider, "mapVote", "forgotten-grove")).error, /active room/i);
  assert.match((await emitWithAck(first, "mapVote", "unknown-map")).error, /invalid map/i);
  assert.match((await emitWithAck(first, "mapVote", { mapId: "forgotten-grove" })).error,
    /invalid map/i);

  const firstLocked = waitForEvent(first, "state",
    state => state.phase === "MAP_VOTE" && state.mapVoteLocks[0]);
  const secondLocked = waitForEvent(second, "state",
    state => state.phase === "MAP_VOTE" && state.mapVoteLocks[0]);
  assert.deepEqual(await emitWithAck(first, "mapVote", "forgotten-grove"), { ok: true });
  const [firstPrivate, secondPrivate] = await Promise.all([firstLocked, secondLocked]);
  for (const state of [firstPrivate, secondPrivate]) {
    assert.deepEqual(state.mapVoteLocks, [true, false]);
    assert.equal(state.mapId, null);
    assert.equal(state.mapReveal, null);
    assert.equal(Object.hasOwn(state, "mapVotes"), false);
  }
  assert.match((await emitWithAck(first, "mapVote", "moonlit-shrine")).error, /already submitted/i);
  assert.match((await emitWithAck(first, "move", "Attack")).error, /selection/i);
  assert.equal(secondVoting.phase, "MAP_VOTE");

  const revealFirst = waitForEvent(first, "state", state => state.phase === "MAP_REVEAL");
  const revealSecond = waitForEvent(second, "state", state => state.phase === "MAP_REVEAL");
  assert.deepEqual(await emitWithAck(second, "mapVote", "moonlit-shrine"), { ok: true });
  const [firstReveal, secondReveal] = await Promise.all([revealFirst, revealSecond]);
  for (const state of [firstReveal, secondReveal]) {
    assert.deepEqual(state.mapReveal.votes,
      ["forgotten-grove", "moonlit-shrine"]);
    assert.equal(state.mapId, state.mapReveal.mapId);
    assert.ok(["forgotten-grove", "moonlit-shrine"].includes(state.mapId));
  }
});

test("matching votes select the shared map and both players receive the same reveal", async t => {
  const { connect } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  await join(first, "SAME");
  const result = await joinAndStartMatch(first, second, "SAME");
  assert.deepEqual(result.mapVoteStates[0].mapVoteLocks, [false, false]);
  assert.equal(result.revealStates[0].mapId, "forgotten-grove");
  assert.equal(result.revealStates[1].mapId, "forgotten-grove");
  assert.equal(result.selectStates[0].mapId, result.selectStates[1].mapId);
  assert.deepEqual(result.revealStates[0].mapReveal.votes,
    ["forgotten-grove", "forgotten-grove"]);
});

test("different votes use the server-controlled equal-choice tie breaker", async t => {
  for (const selectedIndex of [0, 1]) {
    const { connect } = await createFixture(t, {
      roomManagerOptions: { randomInt: () => selectedIndex }
    });
    const first = await connect();
    const second = await connect();
    const code = selectedIndex === 0 ? "TIEA" : "TIEB";
    await join(first, code);
    const result = await joinAndStartMatch(
      first, second, code, "crimson-citadel", "ember-forge");
    const expected = selectedIndex === 0 ? "crimson-citadel" : "ember-forge";
    assert.equal(result.revealStates[0].mapId, expected);
    assert.equal(result.revealStates[1].mapId, expected);
    assert.deepEqual(result.revealStates[0].mapReveal.votes,
      ["crimson-citadel", "ember-forge"]);
  }
});

test("combat is rejected during MAP_REVEAL and the server advances to SELECT", async t => {
  const { connect } = await createFixture(t);
  const first = await connect();
  const second = await connect();
  await join(first, "PHAS");
  await joinIntoMapVote(first, second, "PHAS");

  const revealFirst = waitForEvent(first, "state", state => state.phase === "MAP_REVEAL");
  const revealSecond = waitForEvent(second, "state", state => state.phase === "MAP_REVEAL");
  const firstSelect = waitForEvent(first, "state", state => state.phase === "SELECT");
  const secondSelect = waitForEvent(second, "state", state => state.phase === "SELECT");
  await emitWithAck(first, "mapVote", "crimson-citadel");
  await emitWithAck(second, "mapVote", "moonlit-shrine");
  const [firstReveal, secondReveal] = await Promise.all([revealFirst, revealSecond]);
  assert.equal(firstReveal.phase, "MAP_REVEAL");
  assert.equal(secondReveal.phase, "MAP_REVEAL");
  assert.match((await emitWithAck(first, "move", "Attack")).error, /selection/i);
  const [firstReady, secondReady] = await Promise.all([firstSelect, secondSelect]);
  assert.equal(firstReady.phase, "SELECT");
  assert.equal(secondReady.phase, "SELECT");
});

test("disconnect during map voting or reveal removes the room and invalidates reveal timers", async t => {
  const scheduled = [];
  const { connect, game } = await createFixture(t, {
    roomManagerOptions: {
      schedule(callback, delay) {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      cancel() {}
    }
  });
  const first = await connect();
  const second = await connect();
  await join(first, "DISC");
  await joinIntoMapVote(first, second, "DISC");

  await emitWithAck(first, "mapVote", "forgotten-grove");
  const reveal = waitForEvent(first, "state", state => state.phase === "MAP_REVEAL");
  await emitWithAck(second, "mapVote", "ember-forge");
  await reveal;
  assert.equal(scheduled.length, 1);
  const opponentLeft = waitForEvent(second, "opponentLeft");
  first.disconnect();
  await opponentLeft;
  assert.equal(game.roomManager.hasRoom("DISC"), false);

  let stateCount = 0;
  second.on("state", () => { stateCount++; });
  scheduled[0].callback();
  assert.equal(stateCount, 0);

  const third = await connect();
  const fourth = await connect();
  await join(third, "WAIT");
  await joinIntoMapVote(third, fourth, "WAIT");
  const waitingOpponentLeft = waitForEvent(fourth, "opponentLeft");
  third.disconnect();
  await waitingOpponentLeft;
  assert.equal(game.roomManager.hasRoom("WAIT"), false);
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
  await joinAndStartMatch(first, second, created.code);

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
  await joinAndStartMatch(first, second, created.code);

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
  await joinAndStartMatch(first, second, created.code);

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
        if (delay !== RESOLUTION_DELAY_MS) {
          callback();
          return scheduled.length + 1;
        }
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      cancel() {}
    }
  });
  const first = await connect();
  const second = await connect();
  const created = await join(first, "STAL");
  await joinAndStartMatch(first, second, created.code);

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
