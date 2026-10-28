const EVENTS = Object.freeze({
  JOIN: "join",
  CONFIGURE: "configure",
  MAP_VOTE: "mapVote",
  MOVE: "move",
  REMATCH: "rematch",
  LEAVE: "leave",
  STATE: "state",
  OPPONENT_LEFT: "opponentLeft"
});

const MOVES = Object.freeze(["Attack", "Defend", "Heal", "Special"]);
const PHASES = Object.freeze({
  WAITING: "WAITING",
  MAP_VOTE: "MAP_VOTE",
  MAP_REVEAL: "MAP_REVEAL",
  SELECT: "SELECT",
  RESOLVING: "RESOLVING",
  GAME_OVER: "GAME_OVER",
  CLOSED: "CLOSED"
});

function isValidMove(move) {
  return typeof move === "string" && MOVES.includes(move);
}

function normalizeRoomCode(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw !== "string") return null;

  const code = raw.trim().toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

function serializeResult(result) {
  if (!result) return null;
  const publicResult = {
    moves: result.moves.slice(),
    damage: result.damage.slice(),
    heal: result.heal.slice(),
    outcome: result.outcome
  };
  if (Number.isInteger(result.winner)) publicResult.winner = result.winner;
  return publicResult;
}

function serializeRoomState(room, playerIndex) {
  return {
    code: room.code,
    round: room.round,
    phase: room.phase,
    mapId: room.mapId,
    mapVoteLocks: room.mapVotes.map(vote => vote !== null),
    mapReveal: room.phase !== PHASES.MAP_VOTE && room.mapReveal
      ? { ...room.mapReveal, votes: room.mapReveal.votes.slice() }
      : null,
    you: playerIndex,
    players: room.players.map(player => ({
      hp: player.hp,
      locked: player.locked,
      cooldown: player.cooldown,
      characterId: player.characterId,
      variantId: player.variantId
    })),
    result: serializeResult(room.result),
    log: room.log.slice(),
    rematchVotes: room.rematches.size,
    youRematchReady: room.rematches.has(room.players[playerIndex]?.id)
  };
}

module.exports = {
  EVENTS,
  MOVES,
  PHASES,
  isValidMove,
  normalizeRoomCode,
  serializeRoomState
};
