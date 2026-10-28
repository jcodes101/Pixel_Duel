const manifest = require("../../public/assets/characters/manifest.json");

const DEFAULT_CHARACTER_ID = "ninja-samurai";

function getDefaultCosmetics(character) {
  return {
    accentColor: Object.keys(character.cosmetics.accentColor)[0],
    headgear: character.cosmetics.headgear[0],
    accessory: character.cosmetics.accessory[0]
  };
}

function validateCharacterConfiguration(value) {
  if (value === undefined) {
    const character = manifest.characters.find(entry => entry.id === DEFAULT_CHARACTER_ID);
    return {
      ok: true,
      configuration: {
        characterId: character.id,
        cosmetics: getDefaultCosmetics(character)
      }
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Invalid character configuration." };
  }
  if (Object.keys(value).some(key => !["characterId", "cosmetics"].includes(key))) {
    return { ok: false, error: "Character configuration contains unsupported fields." };
  }

  const character = manifest.characters.find(entry => entry.id === value.characterId);
  if (!character) return { ok: false, error: "Invalid character selection." };

  const supplied = value.cosmetics === undefined ? {} : value.cosmetics;
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied) ||
      Object.keys(supplied).some(key =>
        !["accentColor", "headgear", "accessory"].includes(key))) {
    return { ok: false, error: "Invalid cosmetic selection." };
  }

  const defaults = getDefaultCosmetics(character);
  const cosmetics = {
    accentColor: supplied.accentColor ?? defaults.accentColor,
    headgear: supplied.headgear ?? defaults.headgear,
    accessory: supplied.accessory ?? defaults.accessory
  };

  if (!Object.hasOwn(character.cosmetics.accentColor, cosmetics.accentColor) ||
      !character.cosmetics.headgear.includes(cosmetics.headgear) ||
      !character.cosmetics.accessory.includes(cosmetics.accessory)) {
    return { ok: false, error: "Unsupported cosmetics for this character." };
  }

  return {
    ok: true,
    configuration: { characterId: character.id, cosmetics }
  };
}

function normalizeJoinRequest(input) {
  if (typeof input === "string" || input == null) {
    return {
      ok: true,
      code: input ?? "",
      ...validateCharacterConfiguration(undefined)
    };
  }
  if (typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key =>
        !["code", "characterId", "cosmetics"].includes(key))) {
    return { ok: false, error: "Invalid join request." };
  }

  const validated = validateCharacterConfiguration({
    characterId: input.characterId ?? DEFAULT_CHARACTER_ID,
    cosmetics: input.cosmetics
  });
  return { ...validated, code: input.code ?? "" };
}

module.exports = {
  DEFAULT_CHARACTER_ID,
  normalizeJoinRequest,
  validateCharacterConfiguration
};
