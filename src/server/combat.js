const MOVES = ["Attack", "Defend", "Heal", "Special"];

function canUseMove(player, move) {
  return MOVES.includes(move) && !(move === "Special" && player.cooldown > 0);
}

function varyDamage(damage, random) {
  if (!damage) return 0;
  return Math.max(1, damage + Math.floor(random() * 7) - 3);
}

function resolveCombat(players, random = Math.random) {
  if (!Array.isArray(players) || players.length !== 2) {
    throw new TypeError("Combat requires exactly two players.");
  }

  const [a, b] = players;
  const moves = [a.move, b.move];
  const damage = [0, 0];
  const heal = [0, 0];

  for (let i = 0; i < 2; i++) {
    const me = players[i], other = players[1 - i];
    if (me.move === "Heal") heal[i] = Math.min(10, 100 - me.hp);
    if (me.move === "Attack")
      damage[1 - i] += other.move === "Defend" ? 5 : 15;
    if (me.move === "Special") damage[1 - i] += 30;
  }

  for (let i = 0; i < 2; i++) {
    damage[i] = varyDamage(damage[i], random);
    players[i].hp = Math.max(0,
      Math.min(100, players[i].hp + heal[i]) - damage[i]);
  }

  for (const player of players) {
    if (player.move === "Special") player.cooldown = 3;
    else player.cooldown = Math.max(0, player.cooldown - 1);
  }

  const outcome = `P1 ${moves[0]} / P2 ${moves[1]} | Damage: ${damage[0]}, ${damage[1]} | Heal: ${heal[0]}, ${heal[1]}`;
  return { moves, damage, heal, outcome };
}

function getWinner(players) {
  if (players[0].hp <= 0 && players[1].hp <= 0) return -1;
  if (players[0].hp <= 0) return 1;
  if (players[1].hp <= 0) return 0;
  return null;
}

module.exports = { canUseMove, getWinner, resolveCombat, varyDamage };
