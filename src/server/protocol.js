const EVENTS = Object.freeze({
  JOIN: "join",
  CONFIGURE: "configure",
  MOVE: "move",
  REMATCH: "rematch",
  STATE: "state",
  OPPONENT_LEFT: "opponentLeft"
});

const MOVES = Object.freeze(["Attack", "Defend", "Heal", "Special"]);
const PHASES = Object.freeze({
  WAITING: "WAITING",
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
    you: playerIndex,
    players: room.players.map(player => ({
      hp: player.hp,
      locked: player.locked,
      cooldown: player.cooldown,
      characterId: player.characterId,
      cosmetics: { ...player.cosmetics }
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
