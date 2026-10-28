const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("../public/assets/characters/manifest.json");
const {
  defaultCharacterConfiguration,
  normalizeJoinRequest,
  validateCharacterConfiguration
} = require("../src/server/characterConfig");

const expectedIds = ["ninja", "samurai", "knight", "wizard", "skeleton", "yokai"];
const expectedVariants = {
  ninja: ["kunoichi", "ninja-monk", "ninja-peasant"],
  samurai: ["samurai", "samurai-archer", "samurai-commander"],
  knight: ["knight-1", "knight-2", "knight-3"],
  wizard: ["fire-wizard", "lightning-mage", "wanderer-magican"],
  skeleton: ["skeleton-archer", "skeleton-spearman", "skeleton-warrior"],
  yokai: ["karasu-tengu", "kitsune", "yamabushi-tengu"]
};

test("the roster contains the six stable character class identifiers", () => {
  assert.deepEqual(manifest.classes.map(character => character.id), expectedIds);
  assert.ok(manifest.classes.every(character => character.variants.length === 3));
});

test("all discovered sprite variants are registered under their class", () => {
  for (const character of manifest.classes) {
    assert.deepEqual(character.variants.map(variant => variant.id), expectedVariants[character.id]);
    assert.ok(character.variants.every(variant => variant.name && variant.folder));
  }
});

test("server accepts each class and variant pair and supplies a stable class default", () => {
  for (const character of manifest.classes) {
    for (const variant of character.variants) {
      const result = validateCharacterConfiguration({
        characterId: character.id,
        variantId: variant.id
      });
      assert.equal(result.ok, true);
      assert.deepEqual(result.configuration, {
        characterId: character.id,
        variantId: variant.id
      });
    }
  }
  assert.deepEqual(defaultCharacterConfiguration(), {
    characterId: "ninja",
    variantId: "kunoichi"
  });
});

test("server rejects invalid classes, unavailable variants, and cross-class variants", () => {
  assert.equal(validateCharacterConfiguration({ characterId: "dragon", variantId: "dragon" }).ok,
    false);
  assert.equal(validateCharacterConfiguration({
    characterId: "ninja",
    variantId: "not-a-ninja"
  }).ok, false);
  assert.equal(validateCharacterConfiguration({
    characterId: "ninja",
    variantId: "samurai-archer"
  }).ok, false);
});

test("client-provided paths, cosmetics, gameplay stats, and player indexes are rejected", () => {
  for (const extra of [
    { assetPath: "../../files/evil.png" },
    { cosmetics: { accentColor: "violet" } },
    { stats: { hp: 10000, damage: 10000 } },
    { playerIndex: 1 }
  ]) {
    assert.equal(validateCharacterConfiguration({
      characterId: "knight",
      variantId: "knight-1",
      ...extra
    }).ok, false);
  }
  assert.equal(normalizeJoinRequest({
    code: "SAFE",
    characterId: "ninja",
    variantId: "kunoichi",
    assetPath: "/assets/characters/wizard"
  }).ok, false);
});

test("the client validates character and variant pairs against the same registry", async () => {
  const {
    isValidCharacterConfiguration,
    validateCharacterManifest
  } = await import("../public/js/game/assetLoader.mjs");
  assert.equal(validateCharacterManifest(manifest), true);
  assert.equal(isValidCharacterConfiguration(manifest, {
    characterId: "wizard",
    variantId: "lightning-mage"
  }), true);
  assert.equal(isValidCharacterConfiguration(manifest, {
    characterId: "wizard",
    variantId: "samurai-archer"
  }), false);
  assert.equal(isValidCharacterConfiguration(manifest, {
    characterId: "mage",
    variantId: "fire-wizard"
  }), false);
});

test("the character animation manifest rejects unsafe paths and incomplete action data", async () => {
  const { validateCharacterManifest } = await import("../public/js/game/assetLoader.mjs");
  const unsafePath = structuredClone(manifest);
  unsafePath.classes[0].variants[0].animations.idle.file = "../outside.png";
  assert.equal(validateCharacterManifest(unsafePath), false);

  const missingIdle = structuredClone(manifest);
  delete missingIdle.classes[0].variants[0].animations.idle;
  assert.equal(validateCharacterManifest(missingIdle), false);

  const brokenAction = structuredClone(manifest);
  brokenAction.classes[0].variants[0].actions.attack = "not-present";
  assert.equal(validateCharacterManifest(brokenAction), false);
});

test("legacy local selections migrate or fall back to a valid class variant", async () => {
  const { normalizeSavedCharacterConfiguration } =
    await import("../public/js/game/assetLoader.mjs");
  assert.deepEqual(normalizeSavedCharacterConfiguration(manifest, {
    characterId: "mage",
    cosmetics: { accessory: "floating-orb" }
  }), { characterId: "wizard", variantId: "fire-wizard" });
  assert.deepEqual(normalizeSavedCharacterConfiguration(manifest, {
    characterId: "ninja",
    variantId: "samurai-archer"
  }), { characterId: "ninja", variantId: "kunoichi" });
  assert.deepEqual(normalizeSavedCharacterConfiguration(manifest, {
    characterId: "removed-class"
  }), { characterId: "ninja", variantId: "kunoichi" });
});

test("legacy string joins retain room codes and receive the new default variant", () => {
  const result = normalizeJoinRequest("ABCD");
  assert.equal(result.ok, true);
  assert.equal(result.code, "ABCD");
  assert.deepEqual(result.configuration, { characterId: "ninja", variantId: "kunoichi" });
});

test("every registered sprite sheet has valid one-row frame bounds", async () => {
  const { isValidSpriteSheetBounds } = await import("../public/js/game/assetLoader.mjs");
  const publicRoot = path.join(__dirname, "..", "public");
  let sheetCount = 0;
  for (const character of manifest.classes) {
    for (const variant of character.variants) {
      for (const clip of Object.values(variant.animations)) {
        const file = path.join(publicRoot, "assets", "characters", character.id,
          variant.folder, clip.file);
        const png = fs.readFileSync(file);
        assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a", file);
        const width = png.readUInt32BE(16);
        const height = png.readUInt32BE(20);
        assert.ok(isValidSpriteSheetBounds(clip, width, height), file);
        sheetCount++;
      }
    }
  }
  assert.ok(sheetCount > 150);
});

test("all configured move animations fit within the 1,200 ms resolution window", () => {
  for (const character of manifest.classes) {
    for (const variant of character.variants) {
      for (const action of ["attack", "defend", "heal", "special", "hurt"]) {
        const animationId = variant.actions[action];
        if (!animationId) continue;
        const clip = variant.animations[animationId];
        assert.ok(clip.frameCount * clip.frameDurationMs <= 1200,
          `${character.id}/${variant.id} ${action} exceeds the resolution window`);
      }
    }
  }
});

test("missing action sheets resolve through the documented animation fallback", async () => {
  const { resolveAnimation } = await import("../public/js/game/assetLoader.mjs");
  const peasant = manifest.classes.find(character => character.id === "ninja")
    .variants.find(variant => variant.id === "ninja-peasant");
  const defend = resolveAnimation(peasant, "defend");
  assert.equal(defend.animationId, "idle");
  assert.equal(defend.fallback, true);

  peasant.animations["attack-2"].failed = true;
  const special = resolveAnimation(peasant, "special");
  assert.equal(special.animationId, "attack-1");
  delete peasant.animations["attack-2"].failed;
});

test("sprite loading failures return null and report the failed asset path", async () => {
  const { loadSpriteSheet, isValidSpriteSheetBounds } =
    await import("../public/js/game/assetLoader.mjs");
  const warnings = [];
  let failedSource = "";
  class FailingImage {
    set src(value) {
      failedSource = value;
      queueMicrotask(() => this.onerror());
    }
  }
  assert.equal(isValidSpriteSheetBounds({ frameWidth: 128, frameHeight: 128, frameCount: 9 },
    1151, 128), false);
  const result = await loadSpriteSheet("/missing-character.png", FailingImage,
    path => warnings.push(path));
  assert.equal(result, null);
  assert.equal(failedSource, "/missing-character.png");
  assert.deepEqual(warnings, ["/missing-character.png"]);
});

test("map art falls back unless all five trusted layers load", async () => {
  const { isUsableMapArtwork, loadMapManifest } = await import("../public/js/game/maps.mjs");
  const mapManifest = require("../public/assets/maps/manifest.json");
  const map = structuredClone(mapManifest.maps[0]);
  assert.equal(isUsableMapArtwork(map), false);
  map.artwork.layers = map.artwork.layers.map(layer => ({
    ...layer,
    image: { complete: true, naturalWidth: 320, naturalHeight: 180 }
  }));
  assert.equal(isUsableMapArtwork(map), true);
  map.artwork.layers[2].image = null;
  assert.equal(isUsableMapArtwork(map), false);

  const warnings = [];
  class PartiallyFailingImage {
    set src(value) {
      if (value.includes("crimson-citadel") && value.endsWith("layer_3_hills.png")) {
        queueMicrotask(() => this.onerror());
      } else {
        this.complete = true;
        this.naturalWidth = 320;
        this.naturalHeight = 180;
        queueMicrotask(() => this.onload());
      }
    }
  }
  const maps = await loadMapManifest(
    async () => ({ ok: true, json: async () => structuredClone(mapManifest) }),
    PartiallyFailingImage,
    message => warnings.push(message)
  );
  assert.equal(isUsableMapArtwork(maps[0]), true);
  assert.equal(isUsableMapArtwork(maps[1]), false);
  assert.equal(warnings.length, 1);
});

test("player labels remain tied to server-assigned indexes", async () => {
  const { getPlayerIdentityLabel } = await import("../public/js/game/assetLoader.mjs");
  assert.equal(getPlayerIdentityLabel(0, 0), "P1 (You)");
  assert.equal(getPlayerIdentityLabel(1, 0), "P2 (Opponent)");
  assert.equal(getPlayerIdentityLabel(0, 1), "P1 (Opponent)");
  assert.equal(getPlayerIdentityLabel(1, 1), "P2 (You)");
});
