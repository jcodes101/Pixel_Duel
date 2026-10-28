const { randomInt: cryptoRandomInt } = require("node:crypto");
const { canUseMove, getWinner, resolveCombat } = require("./combat");
const { EVENTS, PHASES, isValidMove, normalizeRoomCode, serializeRoomState } = require("./protocol");

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_ROOM_PLAYERS = 2;
const RESOLUTION_DELAY_MS = 1200;
const JOIN_ATTEMPT_LIMIT = 8;
const JOIN_ATTEMPT_WINDOW_MS = 10_000;

function generateRoomCode(rooms, randomInt = cryptoRandomInt) {
  let roomCode;
  do {
    roomCode = Array.from({ length: 4 }, () =>
      ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length)]
    ).join("");
  } while (rooms.has(roomCode));
  return roomCode;
}

function createPlayer(id, playerIndex) {
  return { id, playerIndex, hp: 100, move: null, locked: false, cooldown: 0 };
}

function createRoom(code) {
  return {
    code,
    players: [],
    phase: PHASES.WAITING,
    round: 1,
    log: [],
    result: null,
    rematches: new Set(),
    resolutionTimer: null,
    resolutionToken: 0
  };
}

function createRoomManager(options = {}) {
  const rooms = new Map();
  const joinAttempts = new Map();
  const emitToSocket = options.emitToSocket || (() => {});
  const randomInt = options.randomInt || cryptoRandomInt;
  const combatRandom = options.combatRandom || Math.random;
  const schedule = options.schedule || setTimeout;
  const cancel = options.cancel || clearTimeout;
  const now = options.now || Date.now;
  const resolutionDelayMs = options.resolutionDelayMs ?? RESOLUTION_DELAY_MS;
  const joinAttemptLimit = options.joinAttemptLimit ?? JOIN_ATTEMPT_LIMIT;
  const joinAttemptWindowMs = options.joinAttemptWindowMs ?? JOIN_ATTEMPT_WINDOW_MS;

  function publish(room) {
    room.players.forEach(player => {
      emitToSocket(player.id, EVENTS.STATE,
        serializeRoomState(room, player.playerIndex));
    });
  }

  function reset(room) {
    room.round = 1;
    room.phase = PHASES.SELECT;
    room.log = [];
    room.result = null;
    room.players = room.players.map(player => createPlayer(player.id, player.playerIndex));
    room.rematches.clear();
    room.resolutionToken++;
    room.resolutionTimer = null;
  }

  function resolve(room) {
    room.phase = PHASES.RESOLVING;
    room.result = resolveCombat(room.players, combatRandom);
    room.log.push(`Round ${room.round}: ${room.result.outcome}`);
    publish(room);

    const token = ++room.resolutionToken;
    room.resolutionTimer = schedule(() => {
      if (rooms.get(room.code) !== room ||
          room.phase !== PHASES.RESOLVING ||
          room.resolutionToken !== token) return;

      room.resolutionTimer = null;
      const winner = getWinner(room.players);
      if (winner !== null) {
        room.phase = PHASES.GAME_OVER;
        room.result.winner = winner;
      } else {
        room.round++;
        room.phase = PHASES.SELECT;
        room.players.forEach(player => {
          player.move = null;
          player.locked = false;
        });
      }
      publish(room);
    }, resolutionDelayMs);
  }

  function trackJoinAttempt(socketId) {
    const cutoff = now() - joinAttemptWindowMs;
    const recent = (joinAttempts.get(socketId) || []).filter(time => time > cutoff);
    if (recent.length >= joinAttemptLimit) {
      joinAttempts.set(socketId, recent);
      return false;
    }
    recent.push(now());
    joinAttempts.set(socketId, recent);
    return true;
  }

  return {
    rooms,

    join(socket, rawCode) {
      if (!trackJoinAttempt(socket.id)) {
        return { error: "Too many join attempts. Please wait and try again." };
      }
      if (socket.data.room) return { error: "Already in a room." };

      const normalizedCode = normalizeRoomCode(rawCode);
      if (normalizedCode === null) return { error: "Enter a 4-letter code." };

      const code = normalizedCode || generateRoomCode(rooms, randomInt);
      let room = rooms.get(code);
      if (room && (room.players.length >= MAX_ROOM_PLAYERS || room.phase !== PHASES.WAITING)) {
        return { error: "Room unavailable or full." };
      }
      if (!room) {
        room = createRoom(code);
        rooms.set(code, room);
      }

      const playerIndex = room.players.length;
      room.players.push(createPlayer(socket.id, playerIndex));
      socket.data.room = code;
      if (room.players.length === MAX_ROOM_PLAYERS) reset(room);
      return { code, playerIndex };
    },

    publishRoom(code) {
      const room = rooms.get(code);
      if (room) publish(room);
    },

    submitMove(socket, move) {
      const room = rooms.get(socket.data.room);
      if (!room) return { error: "You are not in an active room." };
      if (room.phase !== PHASES.SELECT) {
        return { error: "Moves can only be submitted during selection." };
      }
      const player = room.players.find(candidate => candidate.id === socket.id);
      if (!player) return { error: "You are not a player in this room." };
      if (!isValidMove(move)) return { error: "Invalid move." };
      if (player.locked) return { error: "Move already submitted." };
      if (!canUseMove(player, move)) return { error: "Special is on cooldown." };

      room.result = null;
      player.move = move;
      player.locked = true;
      publish(room);
      if (room.players.length === MAX_ROOM_PLAYERS &&
          room.players.every(candidate => candidate.locked)) {
        resolve(room);
      }
      return { ok: true };
    },

    requestRematch(socket) {
      const room = rooms.get(socket.data.room);
      if (!room || room.phase !== PHASES.GAME_OVER) {
        return { error: "Rematch is only available after the duel." };
      }
      if (!room.players.some(player => player.id === socket.id)) {
        return { error: "You are not a player in this room." };
      }

      room.rematches.add(socket.id);
      if (room.rematches.size === 2) reset(room);
      publish(room);
      return { ok: true };
    },

    disconnect(socket) {
      const code = socket.data.room;
      const room = rooms.get(code);
      joinAttempts.delete(socket.id);
      socket.data.room = null;
      if (!room) return null;

      const opponent = room.players.find(player => player.id !== socket.id);
      rooms.delete(code);
      room.phase = PHASES.CLOSED;
      room.resolutionToken++;
      if (room.resolutionTimer !== null) cancel(room.resolutionTimer);
      room.resolutionTimer = null;

      if (opponent) emitToSocket(opponent.id, EVENTS.OPPONENT_LEFT);
      return { code, opponentId: opponent && opponent.id };
    },

    hasRoom(code) {
      return rooms.has(code);
    }
  };
}

module.exports = {
  JOIN_ATTEMPT_LIMIT,
  JOIN_ATTEMPT_WINDOW_MS,
  RESOLUTION_DELAY_MS,
  createRoomManager,
  generateRoomCode
};
