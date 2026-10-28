export async function loadMapManifest() {
  const response = await fetch("/assets/maps/manifest.json");
  if (!response.ok) throw new Error("The battlefield map manifest could not be loaded.");
  const manifest = await response.json();
  if (!Array.isArray(manifest.maps) || manifest.maps.length !== 5 ||
      manifest.maps.some(map => typeof map.id !== "string" ||
        typeof map.name !== "string" || typeof map.environment !== "string" ||
        typeof map.palette?.sky !== "string" ||
        typeof map.palette?.ground !== "string" ||
        typeof map.effects?.type !== "string" ||
        !Number.isInteger(map.effects?.count) ||
        !Array.isArray(map.layers) ||
        !Array.isArray(map.foreground) ||
        map.fallback !== "procedural-canvas")) {
    throw new Error("The battlefield map manifest is invalid.");
  }
  return manifest.maps;
}

export function getMapById(maps, mapId) {
  return maps.find(map => map.id === mapId) || maps[0];
}
