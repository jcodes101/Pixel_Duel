const test = require("node:test");
const assert = require("node:assert/strict");
const manifest = require("../public/assets/maps/manifest.json");

function createContext() {
  const context = {
    draws: [],
    paths: [],
    save() {},
    restore() {},
    beginPath() { this.paths.push([]); },
    rect(x, y, width, height) {
      this.paths.at(-1)?.push([x, y, width, height]);
    },
    clip(rule) { this.clipRule = rule; },
    drawImage(image) { this.draws.push(image.layer ?? image.label); },
    fillRect() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    arc() {}
  };
  return context;
}

function loadMapArtwork(map) {
  return {
    ...structuredClone(map),
    artwork: {
      ...structuredClone(map.artwork),
      layers: map.artwork.layers.map((layer, index) => ({
        ...layer,
        image: { complete: true, naturalWidth: 320, naturalHeight: 180, layer: index }
      }))
    }
  };
}

test("layered maps draw all artwork behind fighters, then clip the depth pass", async () => {
  const { createMapRenderer, getFighterSafeAreas, isPointInFighterSafeArea } =
    await import("../public/js/game/mapRenderer.js");
  const map = loadMapArtwork(manifest.maps[0]);
  const context = createContext();
  const renderer = createMapRenderer(context);

  const floorY = renderer.drawBackground(map, 0, 0, true);
  assert.equal(floorY, map.artwork.floorY);
  assert.deepEqual(context.draws, [0, 1, 2, 3, 4]);

  context.draws.push("fighters and combat effects");
  const safeAreas = getFighterSafeAreas(floorY);
  renderer.drawForeground(map, 0, safeAreas);

  assert.deepEqual(context.draws, [0, 1, 2, 3, 4, "fighters and combat effects", 4]);
  assert.equal(context.clipRule, "evenodd");
  assert.deepEqual(context.paths.at(-1), [
    [0, 0, 480, 270],
    [56, floorY - 106, 152, 108],
    [272, floorY - 106, 152, 108]
  ]);
  for (const centerX of [132, 348]) {
    assert.equal(isPointInFighterSafeArea(centerX, floorY - 90, safeAreas), true);
    assert.equal(isPointInFighterSafeArea(centerX - 71, floorY - 90, safeAreas), true);
    assert.equal(isPointInFighterSafeArea(centerX + 71, floorY - 90, safeAreas), true);
  }
  assert.equal(isPointInFighterSafeArea(10, floorY - 20, safeAreas), false);
});

test("all five maps keep their artwork or procedural fallback and floor", async () => {
  const { createMapRenderer } = await import("../public/js/game/mapRenderer.js");
  assert.equal(manifest.maps.length, 5);
  assert.deepEqual(manifest.maps.slice(0, 3).map(map => map.artwork.layers.length), [5, 5, 5]);

  for (const map of manifest.maps.slice(0, 3)) {
    const context = createContext();
    const renderer = createMapRenderer(context);
    assert.equal(renderer.drawBackground(loadMapArtwork(map), 0, 0, true), 245);
    assert.deepEqual(context.draws, [0, 1, 2, 3, 4]);
  }

  for (const map of manifest.maps.slice(3)) {
    const context = createContext();
    const renderer = createMapRenderer(context);
    assert.equal(renderer.drawBackground(map, 0, 0, true), 211);
    renderer.drawForeground(map, 0, []);
    assert.deepEqual(context.draws, []);
  }
});
