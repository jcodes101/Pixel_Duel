export async function loadCharacterManifest(fetcher = fetch) {
  const response = await fetcher("/assets/characters/manifest.json");
  if (!response.ok) throw new Error(`Character manifest request failed (${response.status}).`);

  const manifest = await response.json();
  if (!manifest || manifest.frameWidth !== 64 || manifest.frameHeight !== 64 ||
      !Array.isArray(manifest.characters) || manifest.characters.length !== 7) {
    throw new Error("Character manifest has an unsupported format.");
  }
  await Promise.all(manifest.characters.map(async character => {
    character.frameWidth = manifest.frameWidth;
    character.frameHeight = manifest.frameHeight;
    character.spriteImage = character.spriteSheet
      ? await loadSpriteSheet(character.spriteSheet, globalThis.Image,
        path => console.warn(`Using the pixel fallback for missing character art: ${path}`))
      : null;
  }));
  return manifest;
}

export function isValidCharacterConfiguration(manifest, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const character = manifest.characters.find(entry => entry.id === value.characterId);
  const cosmetics = value.cosmetics;
  if (!character || !cosmetics || typeof cosmetics !== "object" || Array.isArray(cosmetics)) {
    return false;
  }
  if (Object.keys(cosmetics).some(key =>
    !["accentColor", "headgear", "accessory"].includes(key))) return false;
  return Object.hasOwn(character.cosmetics.accentColor, cosmetics.accentColor) &&
    character.cosmetics.headgear.includes(cosmetics.headgear) &&
    character.cosmetics.accessory.includes(cosmetics.accessory);
}

export function getPlayerIdentityLabel(playerIndex, localPlayerIndex) {
  return `P${playerIndex + 1} (${playerIndex === localPlayerIndex ? "You" : "Opponent"})`;
}

export function loadSpriteSheet(path, ImageConstructor = globalThis.Image, onFallback = () => {}) {
  if (!path || typeof ImageConstructor !== "function") {
    onFallback(path || "sprite sheet not configured");
    return Promise.resolve(null);
  }

  return new Promise(resolve => {
    const image = new ImageConstructor();
    image.onload = () => resolve(image);
    image.onerror = () => {
      onFallback(path);
      resolve(null);
    };
    image.src = path;
  });
}
