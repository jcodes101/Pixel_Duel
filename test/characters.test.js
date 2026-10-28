const test = require("node:test");
const assert = require("node:assert/strict");
const manifest = require("../public/assets/characters/manifest.json");
const {
  normalizeJoinRequest,
  validateCharacterConfiguration
} = require("../src/server/characterConfig");

const expectedIds = [
  "ninja-samurai",
  "knight",
  "mage",
  "assassin",
  "brute",
  "gunslinger",
  "scythe-wielder"
];

test("the roster contains all seven supported character identifiers", () => {
  assert.deepEqual(manifest.characters.map(character => character.id), expectedIds);
  assert.ok(manifest.characters.every(character =>
    character.spriteSheet === null &&
    manifest.frameWidth === 64 &&
    manifest.frameHeight === 64));
});

test("server accepts valid character and cosmetic configurations", () => {
  for (const character of manifest.characters) {
    const cosmetics = {
      accentColor: Object.keys(character.cosmetics.accentColor)[0],
      headgear: character.cosmetics.headgear[0],
      accessory: character.cosmetics.accessory[0]
    };
    const result = validateCharacterConfiguration({
      characterId: character.id,
      cosmetics
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.configuration, { characterId: character.id, cosmetics });
  }
});

test("server rejects unknown characters and unsupported cosmetic values", () => {
  assert.equal(validateCharacterConfiguration({ characterId: "dragon" }).ok, false);
  assert.equal(validateCharacterConfiguration({
    characterId: "knight",
    cosmetics: { accentColor: "ultraviolet" }
  }).ok, false);
  assert.equal(validateCharacterConfiguration({
    characterId: "knight",
    cosmetics: { headgear: "mage-hood" }
  }).ok, false);
  assert.equal(validateCharacterConfiguration({
    characterId: "knight",
    cosmetics: { accessory: "arbitrary-image.png" }
  }).ok, false);
});

test("client-provided gameplay stats and player indexes are rejected", () => {
  assert.equal(normalizeJoinRequest({
    code: "",
    characterId: "knight",
    stats: { hp: 10000, damage: 10000 }
  }).ok, false);
  assert.equal(validateCharacterConfiguration({
    characterId: "knight",
    playerIndex: 1
  }).ok, false);
  assert.equal(validateCharacterConfiguration({
    characterId: "knight",
    stats: { hp: 1 }
  }).ok, false);
});

test("stored character preferences are accepted only when all cosmetics are allowlisted", async () => {
  const { isValidCharacterConfiguration } = await import("../public/js/game/assetLoader.mjs");

  assert.equal(isValidCharacterConfiguration(manifest, {
    characterId: "knight",
    cosmetics: {
      accentColor: "azure",
      headgear: "winged-helm",
      accessory: "cape"
    }
  }), true);
  assert.equal(isValidCharacterConfiguration(manifest, {
    characterId: "knight",
    cosmetics: {
      accentColor: "ultraviolet",
      headgear: "winged-helm",
      accessory: "cape"
    }
  }), false);
  assert.equal(isValidCharacterConfiguration(manifest, {
    characterId: "mage",
    cosmetics: {
      accentColor: "violet",
      headgear: "winged-helm",
      accessory: "cape"
    }
  }), false);
});

test("legacy string join requests receive default cosmetic-only configuration", () => {
  const result = normalizeJoinRequest("ABCD");

  assert.equal(result.ok, true);
  assert.equal(result.code, "ABCD");
  assert.equal(result.configuration.characterId, "ninja-samurai");
  assert.deepEqual(Object.keys(result.configuration.cosmetics),
    ["accentColor", "headgear", "accessory"]);
});

test("asset loader safely falls back when a sprite sheet is missing", async () => {
  const { loadSpriteSheet } = await import("../public/js/game/assetLoader.mjs");
  const fallbackPaths = [];
  let brokenSource = "";

  class FailingImage {
    set src(value) {
      brokenSource = value;
      queueMicrotask(() => this.onerror());
    }
  }

  const result = await loadSpriteSheet("/missing-character.png", FailingImage,
    path => fallbackPaths.push(path));
  assert.equal(result, null);
  assert.equal(brokenSource, "/missing-character.png");
  assert.deepEqual(fallbackPaths, ["/missing-character.png"]);
});

test("player identity labels use player indexes rather than character choice", async () => {
  const { getPlayerIdentityLabel } = await import("../public/js/game/assetLoader.mjs");

  assert.equal(getPlayerIdentityLabel(0, 0), "P1 (You)");
  assert.equal(getPlayerIdentityLabel(1, 0), "P2 (Opponent)");
  assert.equal(getPlayerIdentityLabel(0, 1), "P1 (Opponent)");
  assert.equal(getPlayerIdentityLabel(1, 1), "P2 (You)");
});
