export const CHARACTER_IDS = ["ninja", "samurai", "knight", "wizard", "skeleton", "yokai"];

const LEGACY_SELECTIONS = {
  "ninja-samurai": ["ninja", "ninja-monk"],
  mage: ["wizard", "fire-wizard"],
  assassin: ["ninja", "kunoichi"],
  brute: ["knight", "knight-1"],
  gunslinger: ["samurai", "samurai-archer"],
  "scythe-wielder": ["skeleton", "skeleton-warrior"]
};

const REQUIRED_ACTIONS = ["attack", "defend", "heal", "special", "hurt", "victory", "defeat"];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeFileName(value) {
  return typeof value === "string" && /^[\w .+-]+\.png$/i.test(value) &&
    !value.includes("..") && !value.includes("/") && !value.includes("\\");
}

export function validateCharacterManifest(manifest) {
  if (!isRecord(manifest) || manifest.version !== 2 ||
      manifest.frameOrder !== "left-to-right" || !Array.isArray(manifest.classes) ||
      manifest.classes.length !== CHARACTER_IDS.length ||
      manifest.classes.some((character, index) =>
        !isRecord(character) || character.id !== CHARACTER_IDS[index] ||
        typeof character.name !== "string" || typeof character.description !== "string" ||
        !Array.isArray(character.variants) || character.variants.length === 0)) return false;

  return manifest.classes.every(character => {
    const variantIds = new Set();
    return character.variants.every(variant => {
      if (!isRecord(variant) || typeof variant.id !== "string" ||
          variantIds.has(variant.id) || typeof variant.name !== "string" ||
          typeof variant.folder !== "string" || !variant.folder ||
          variant.folder.includes("..") || variant.folder.includes("/") ||
          variant.folder.includes("\\") || !["right", "left"].includes(variant.facing) ||
          !Number.isFinite(variant.displayScale) || variant.displayScale <= 0 ||
          !Number.isInteger(variant.frameWidth) || variant.frameWidth <= 0 ||
          !Number.isInteger(variant.frameHeight) || variant.frameHeight <= 0 ||
          !isRecord(variant.animations) || !isRecord(variant.actions)) return false;

      variantIds.add(variant.id);
      const clipsValid = Object.entries(variant.animations).every(([id, clip]) =>
        /^[a-z0-9-]+$/.test(id) && isRecord(clip) && isSafeFileName(clip.file) &&
        Number.isInteger(clip.frameWidth) && clip.frameWidth > 0 &&
        Number.isInteger(clip.frameHeight) && clip.frameHeight > 0 &&
        Number.isInteger(clip.frameCount) && clip.frameCount > 0 &&
        Number.isFinite(clip.frameDurationMs) && clip.frameDurationMs > 0 &&
        typeof clip.loop === "boolean" && isRecord(clip.offset) &&
        Number.isFinite(clip.offset.x) && Number.isFinite(clip.offset.y));
      const actionsValid = REQUIRED_ACTIONS.every(action =>
        Object.hasOwn(variant.actions, action) &&
        (variant.actions[action] === null ||
          Object.hasOwn(variant.animations, variant.actions[action])));
      return clipsValid && actionsValid && Object.hasOwn(variant.animations, "idle");
    });
  });
}

export function isValidSpriteSheetBounds(clip, imageWidth, imageHeight) {
  return isRecord(clip) && Number.isInteger(imageWidth) && Number.isInteger(imageHeight) &&
    Number.isInteger(clip.frameWidth) && clip.frameWidth > 0 &&
    Number.isInteger(clip.frameHeight) && clip.frameHeight > 0 &&
    Number.isInteger(clip.frameCount) && clip.frameCount > 0 &&
    clip.frameWidth * clip.frameCount <= imageWidth && clip.frameHeight <= imageHeight;
}

export async function loadCharacterManifest(
  fetcher = fetch,
  ImageConstructor = globalThis.Image,
  onWarning = message => console.warn(message)
) {
  const response = await fetcher("/assets/characters/manifest.json");
  if (!response.ok) throw new Error(`Character manifest request failed (${response.status}).`);

  const manifest = await response.json();
  if (!validateCharacterManifest(manifest)) {
    throw new Error("Character manifest has an unsupported format.");
  }

  await Promise.all(manifest.classes.flatMap(character => character.variants.map(variant =>
    loadCharacterAnimation(manifest, character.id, variant.id, "idle",
      ImageConstructor, onWarning))));
  return manifest;
}

function safeAnimationPath(character, variant, clip) {
  return `/assets/characters/${encodeURIComponent(character.id)}/` +
    `${encodeURIComponent(variant.folder)}/${encodeURIComponent(clip.file)}`;
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

export async function loadCharacterAnimation(
  manifest,
  characterId,
  variantId,
  animationId,
  ImageConstructor = globalThis.Image,
  onWarning = message => console.warn(message)
) {
  const character = manifest.classes.find(entry => entry.id === characterId);
  const variant = character?.variants.find(entry => entry.id === variantId);
  const clip = variant?.animations[animationId];
  if (!character || !variant || !clip) return null;
  if (clip.loaded) return clip.image;
  if (clip.loading) return clip.loading;

  const path = safeAnimationPath(character, variant, clip);
  clip.loading = loadSpriteSheet(path, ImageConstructor,
    failedPath => onWarning(`Sprite sheet unavailable: ${failedPath}`)).then(image => {
    clip.loaded = true;
    if (image && isValidSpriteSheetBounds(clip, image.naturalWidth, image.naturalHeight)) {
      clip.image = image;
      clip.failed = false;
    } else {
      clip.image = null;
      clip.failed = true;
      if (image) onWarning(`Sprite sheet frame bounds are invalid: ${path}`);
    }
    return clip.image;
  });
  return clip.loading;
}

export async function preloadCharacterAnimations(
  manifest,
  characterId,
  variantId,
  ImageConstructor = globalThis.Image,
  onWarning = message => console.warn(message)
) {
  const character = manifest.classes.find(entry => entry.id === characterId);
  const variant = character?.variants.find(entry => entry.id === variantId);
  if (!variant) return;

  const animationIds = new Set(["idle", ...Object.values(variant.actions).filter(Boolean)]);
  await Promise.all([...animationIds].map(animationId =>
    loadCharacterAnimation(manifest, characterId, variantId, animationId,
      ImageConstructor, onWarning)));
}

const FALLBACKS = {
  attack: ["attack-1", "attack-2", "attack-3", "idle"],
  defend: ["defend", "protect", "protection", "evasion", "idle"],
  heal: ["cast", "attack-2", "idle"],
  special: ["attack-3", "attack-2", "attack-1", "cast", "idle"],
  hurt: ["hurt", "idle"],
  victory: ["victory", "idle"],
  defeat: ["dead", "fall", "hurt", "idle"],
  idle: ["idle"]
};

export function resolveAnimation(variant, action, requireLoaded = false) {
  if (!variant || !variant.animations) return null;
  const configured = variant.actions?.[action];
  const candidates = [configured, ...(FALLBACKS[action] || FALLBACKS.idle)]
    .filter((id, index, all) => id && all.indexOf(id) === index);
  for (const animationId of candidates) {
    const clip = variant.animations[animationId];
    if (!clip || clip.failed) continue;
    if (requireLoaded && (!clip.loaded || !clip.image)) continue;
    return {
      animationId,
      clip,
      fallback: animationId !== configured
    };
  }
  return null;
}

export function isValidCharacterConfiguration(manifest, value) {
  if (!isRecord(value) || Object.keys(value).some(key =>
    !["characterId", "variantId"].includes(key))) return false;
  const character = manifest.classes.find(entry => entry.id === value.characterId);
  return Boolean(character && character.variants.some(entry => entry.id === value.variantId));
}

export function normalizeSavedCharacterConfiguration(manifest, value) {
  const defaultCharacter = manifest.classes[0];
  const fallback = () => ({
    characterId: defaultCharacter.id,
    variantId: defaultCharacter.variants[0].id
  });
  if (!isRecord(value)) return fallback();
  if (isValidCharacterConfiguration(manifest, value)) {
    return { characterId: value.characterId, variantId: value.variantId };
  }

  const legacy = LEGACY_SELECTIONS[value.characterId];
  if (legacy) {
    const character = manifest.classes.find(entry => entry.id === legacy[0]);
    if (character?.variants.some(entry => entry.id === legacy[1])) {
      return { characterId: legacy[0], variantId: legacy[1] };
    }
  }

  const character = manifest.classes.find(entry => entry.id === value.characterId);
  if (!character) return fallback();
  const variant = character.variants.find(entry => entry.id === value.variantId) ||
    character.variants[0];
  return { characterId: character.id, variantId: variant.id };
}

export function getPlayerIdentityLabel(playerIndex, localPlayerIndex) {
  return `P${playerIndex + 1} (${playerIndex === localPlayerIndex ? "You" : "Opponent"})`;
}
