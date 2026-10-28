const test = require("node:test");
const assert = require("node:assert/strict");
const { canUseMove, getWinner, resolveCombat, varyDamage } = require("../src/server/combat");

function createPlayers(moveA, moveB, hpA = 100, hpB = 100) {
  return [
    { id: "p1", hp: hpA, move: moveA, locked: true, cooldown: 0 },
    { id: "p2", hp: hpB, move: moveB, locked: true, cooldown: 0 }
  ];
}

function resolve(moveA, moveB, hpA = 100, hpB = 100) {
  const players = createPlayers(moveA, moveB, hpA, hpB);
  const result = resolveCombat(players, () => 0.5);
  return { players, result };
}

const combatCases = [
  ["Attack vs Attack", "Attack", "Attack", [15, 15], [0, 0], [85, 85]],
  ["Attack vs Defend", "Attack", "Defend", [0, 5], [0, 0], [100, 95]],
  ["Attack vs Heal", "Attack", "Heal", [0, 15], [0, 10], [100, 85], [100, 90]],
  ["Defend vs Defend", "Defend", "Defend", [0, 0], [0, 0], [100, 100]],
  ["Defend vs Heal", "Defend", "Heal", [0, 0], [0, 10], [100, 100], [100, 90]],
  ["Special vs Attack", "Special", "Attack", [15, 30], [0, 0], [85, 70]],
  ["Special vs Defend", "Special", "Defend", [0, 30], [0, 0], [100, 70]],
  ["Special vs Heal", "Special", "Heal", [0, 30], [0, 10], [100, 70], [100, 90]],
  ["Heal vs Heal", "Heal", "Heal", [0, 0], [10, 10], [90, 90], [80, 80]]
];

for (const [name, moveA, moveB, damage, heal, hp, initialHp = [100, 100]] of combatCases) {
  test(name, () => {
    const { players, result } = resolve(moveA, moveB, ...initialHp);

    assert.deepEqual(result.damage, damage);
    assert.deepEqual(result.heal, heal);
    assert.deepEqual(players.map(player => player.hp), hp);
  });
}

test("positive damage variance remains between minus and plus three", () => {
  const minimum = resolveCombat(createPlayers("Attack", "Defend"), () => 0);
  const maximum = resolveCombat(createPlayers("Attack", "Defend"), () => 0.999999);

  assert.deepEqual(minimum.damage, [0, 2]);
  assert.deepEqual(maximum.damage, [0, 8]);
});

test("variance never lowers positive damage below one", () => {
  assert.equal(varyDamage(1, () => 0), 1);
});

test("healing is applied before incoming damage", () => {
  const { players, result } = resolve("Heal", "Attack", 95, 100);

  assert.deepEqual(result.heal, [5, 0]);
  assert.deepEqual(result.damage, [15, 0]);
  assert.equal(players[0].hp, 85);
});

test("healing is capped at 100 HP", () => {
  const { players, result } = resolve("Heal", "Defend", 95, 100);

  assert.deepEqual(result.heal, [5, 0]);
  assert.equal(players[0].hp, 100);
});

test("HP never drops below zero", () => {
  const { players } = resolve("Attack", "Attack", 1, 1);

  assert.deepEqual(players.map(player => player.hp), [0, 0]);
});

test("Special is available initially and rejected while cooling down", () => {
  const players = createPlayers("Special", "Defend");

  assert.equal(canUseMove(players[0], "Special"), true);
  resolveCombat(players, () => 0.5);
  assert.equal(players[0].cooldown, 3);
  assert.equal(canUseMove(players[0], "Special"), false);
});

test("Special cooldown decreases after non-Special rounds", () => {
  const players = createPlayers("Special", "Defend");
  resolveCombat(players, () => 0.5);

  players[0].move = "Attack";
  resolveCombat(players, () => 0.5);
  assert.equal(players[0].cooldown, 2);

  resolveCombat(players, () => 0.5);
  assert.equal(players[0].cooldown, 1);

  resolveCombat(players, () => 0.5);
  assert.equal(players[0].cooldown, 0);
  assert.equal(canUseMove(players[0], "Special"), true);
});

test("simultaneous lethal damage produces a draw", () => {
  const { players } = resolve("Attack", "Attack", 1, 1);

  assert.equal(getWinner(players), -1);
});

test("winner detection returns the surviving player's index", () => {
  assert.equal(getWinner([{ hp: 1 }, { hp: 0 }]), 0);
  assert.equal(getWinner([{ hp: 0 }, { hp: 1 }]), 1);
  assert.equal(getWinner([{ hp: 1 }, { hp: 1 }]), null);
});

test("resolved result reveals both submitted moves", () => {
  const { result } = resolve("Attack", "Defend");

  assert.deepEqual(result.moves, ["Attack", "Defend"]);
  assert.match(result.outcome, /P1 Attack \/ P2 Defend/);
});

test("combat requires exactly two players", () => {
  assert.throws(() => resolveCombat([]), {
    name: "TypeError",
    message: "Combat requires exactly two players."
  });
});
