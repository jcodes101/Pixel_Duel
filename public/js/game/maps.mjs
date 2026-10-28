import { loadSpriteSheet } from "./assetLoader.mjs";

const MAP_IDS = [
  "forgotten-grove",
  "crimson-citadel",
  "moonlit-shrine",
  "ember-forge",
  "skybound-sanctuary"
];

const ART_LAYER_NAMES = ["sky", "mountains", "hills", "forest", "foreground"];

export function validateMapManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.maps) || manifest.maps.length !== MAP_IDS.length ||
      manifest.maps.some((map, index) => typeof map.id !== "string" || map.id !== MAP_IDS[index] ||
        typeof map.name !== "string" || typeof map.environment !== "string" ||
        typeof map.palette?.sky !== "string" ||
        typeof map.palette?.ground !== "string" ||
        typeof map.effects?.type !== "string" ||
        !Number.isInteger(map.effects?.count) ||
        !Array.isArray(map.layers) ||
        !Array.isArray(map.foreground) ||
        map.fallback !== "procedural-canvas")) return false;

  return manifest.maps.every(map => {
    if (!map.artwork) return true;
    return Number.isFinite(map.artwork.floorY) &&
      Array.isArray(map.artwork.layers) && map.artwork.layers.length === ART_LAYER_NAMES.length &&
      map.artwork.layers.every((layer, index) =>
        layer?.name === ART_LAYER_NAMES[index] &&
        typeof layer.src === "string" &&
        layer.src === `/assets/maps/${map.id}/layers/layer_${index + 1}_${ART_LAYER_NAMES[index]}.png` &&
        Number.isFinite(layer.parallax) && layer.parallax >= 0);
  });
}

export async function loadMapManifest(
  fetcher = fetch,
  ImageConstructor = globalThis.Image,
  onWarning = message => console.warn(message)
) {
  const response = await fetcher("/assets/maps/manifest.json");
  if (!response.ok) throw new Error("The battlefield map manifest could not be loaded.");
  const manifest = await response.json();
  if (!validateMapManifest(manifest)) throw new Error("The battlefield map manifest is invalid.");

  await Promise.all(manifest.maps.filter(map => map.artwork).map(async map => {
    map.artwork.layers = await Promise.all(map.artwork.layers.map(async layer => ({
      ...layer,
      image: await loadSpriteSheet(layer.src, ImageConstructor,
        path => onWarning(`Using the procedural background because map art failed to load: ${path}`))
    })));
  }));
  return manifest.maps;
}

export function isUsableMapArtwork(map) {
  return Boolean(map?.artwork?.layers?.length === ART_LAYER_NAMES.length &&
    map.artwork.layers.every((layer, index) =>
      layer.name === ART_LAYER_NAMES[index] &&
      layer.image?.complete === true && layer.image.naturalWidth > 0 &&
      layer.image.naturalHeight > 0));
}

export function getMapById(maps, mapId) {
  return maps.find(map => map.id === mapId) || maps[0];
}
