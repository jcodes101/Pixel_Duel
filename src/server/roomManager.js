const { randomInt: cryptoRandomInt } = require("node:crypto");
const { canUseMove, getWinner, resolveCombat } = require("./combat");
const { EVENTS, PHASES, isValidMove, normalizeRoomCode, serializeRoomState } = require("./protocol");
const { normalizeJoinRequest, validateCharacterConfiguration } = require("./characterConfig");
const MAPS = require("../../public/assets/maps/manifest.json").maps;

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_ROOM_PLAYERS = 2;
const RESOLUTION_DELAY_MS = 1200;
const MAP_REVEAL_DELAY_MS = 2200;
const JOIN_ATTEMPT_LIMIT = 8;
const JOIN_ATTEMPT_WINDOW_MS = 10_000;
const MAP_IDS = new Set(MAPS.map(map => map.id));

function generateRoomCode(rooms, randomInt = cryptoRandomInt) {
  let roomCode;
  do {
    roomCode = Array.from({ length: 4 }, () =>
      ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length)]
    ).join("");
  } while (rooms.has(roomCode));
  return roomCode;
}

function createPlayer(id, playerIndex, configuration) {
  return {
    id,
    playerIndex,
    hp: 100,
    move: null,
    locked: false,
    cooldown: 0,
    characterId: configuration.characterId,
    variantId: configuration.variantId
  };
}

function createRoom(code) {
  return {
    code,
    players: [],
    phase: PHASES.WAITING,
    round: 1,
    mapId: null,
    mapVotes: [null, null],
    mapReveal: null,
    log: [],
    result: null,
    rematches: new Set(),
    resolutionTimer: null,
    resolutionToken: 0,
    mapRevealTimer: null,
    mapRevealToken: 0
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
  const mapRevealDelayMs = options.mapRevealDelayMs ?? MAP_REVEAL_DELAY_MS;
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
    room.mapVotes = [null, null];
    room.mapReveal = null;
    room.log = [];
    room.result = null;
    room.players = room.players.map(player => createPlayer(player.id, player.playerIndex, {
      characterId: player.characterId,
      variantId: player.variantId
    }));
    room.rematches.clear();
    room.resolutionToken++;
    room.resolutionTimer = null;
  }

  function revealMap(room) {
    room.mapId = room.mapVotes[0] === room.mapVotes[1]
      ? room.mapVotes[0]
      : room.mapVotes[randomInt(0, 2)];
    room.mapReveal = { votes: room.mapVotes.slice(), mapId: room.mapId };
    room.phase = PHASES.MAP_REVEAL;
    publish(room);

    const token = ++room.mapRevealToken;
    room.mapRevealTimer = schedule(() => {
      if (rooms.get(room.code) !== room ||
          room.phase !== PHASES.MAP_REVEAL ||
          room.mapRevealToken !== token) return;

      room.mapRevealTimer = null;
      room.phase = PHASES.SELECT;
      publish(room);
    }, mapRevealDelayMs);
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

  function closeRoomForPlayer(socket) {
    const code = socket.data.room;
    const room = rooms.get(code);
    joinAttempts.delete(socket.id);
    socket.data.room = null;
    if (!room) return null;

    const opponent = room.players.find(player => player.id !== socket.id);
    rooms.delete(code);
    room.phase = PHASES.CLOSED;
    room.resolutionToken++;
    room.mapRevealToken++;
    if (room.resolutionTimer !== null) cancel(room.resolutionTimer);
    if (room.mapRevealTimer !== null) cancel(room.mapRevealTimer);
    room.resolutionTimer = null;
    room.mapRevealTimer = null;

    if (opponent) emitToSocket(opponent.id, EVENTS.OPPONENT_LEFT, { code, reason: "player-left" });
    return { code, opponentId: opponent && opponent.id };
  }

  return {
    rooms,

    join(socket, rawCode) {
      if (!trackJoinAttempt(socket.id)) {
        return { error: "Too many join attempts. Please wait and try again." };
      }
      if (socket.data.room) return { error: "Already in a room." };

      const request = normalizeJoinRequest(rawCode);
      if (!request.ok) return { error: request.error };

      const normalizedCode = normalizeRoomCode(request.code);
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
      room.players.push(createPlayer(socket.id, playerIndex, request.configuration));
      socket.data.room = code;
      if (room.players.length === MAX_ROOM_PLAYERS) {
        room.phase = PHASES.MAP_VOTE;
        room.mapVotes = [null, null];
      }
      return { code, playerIndex };
    },

    publishRoom(code) {
      const room = rooms.get(code);
      if (room) publish(room);
    },

    configurePlayer(socket, configuration) {
      const room = rooms.get(socket.data.room);
      if (!room || room.phase !== PHASES.WAITING) {
        return { error: "Character selection is locked after the match starts." };
      }
      const player = room.players.find(candidate => candidate.id === socket.id);
      if (!player) return { error: "You are not a player in this room." };

      const validated = validateCharacterConfiguration(configuration);
      if (!validated.ok) return { error: validated.error };

      player.characterId = validated.configuration.characterId;
      player.variantId = validated.configuration.variantId;
      publish(room);
      return { ok: true };
    },

    voteMap(socket, mapId) {
      const room = rooms.get(socket.data.room);
      if (!room) return { error: "You are not in an active room." };
      const player = room.players.find(candidate => candidate.id === socket.id);
      if (!player) return { error: "You are not a player in this room." };
      if (room.phase !== PHASES.MAP_VOTE) {
        return { error: "Map votes can only be submitted during map voting." };
      }
      if (typeof mapId !== "string" || !MAP_IDS.has(mapId)) {
        return { error: "Invalid map selection." };
      }
      if (room.mapVotes[player.playerIndex] !== null) {
        return { error: "Map vote already submitted." };
      }

      room.mapVotes[player.playerIndex] = mapId;
      if (room.mapVotes.every(vote => vote !== null)) revealMap(room);
      else publish(room);
      return { ok: true };
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
      if (room.rematches.has(socket.id)) {
        return { error: "Rematch vote already submitted." };
      }

      room.rematches.add(socket.id);
      if (room.rematches.size === 2) reset(room);
      publish(room);
      return { ok: true };
    },

    leave(socket) {
      return closeRoomForPlayer(socket);
    },

    disconnect(socket) {
      return closeRoomForPlayer(socket);
    },

    hasRoom(code) {
      return rooms.has(code);
    }
  };
}

module.exports = {
  JOIN_ATTEMPT_LIMIT,
  JOIN_ATTEMPT_WINDOW_MS,
  MAP_REVEAL_DELAY_MS,
  RESOLUTION_DELAY_MS,
  createRoomManager,
  generateRoomCode
};
