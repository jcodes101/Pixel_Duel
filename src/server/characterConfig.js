const manifest = require("../../public/assets/characters/manifest.json");

const DEFAULT_CHARACTER_ID = "ninja";

function getDefaultVariant(character) {
  return character.variants[0];
}

function defaultCharacterConfiguration(characterId = DEFAULT_CHARACTER_ID) {
  const character = manifest.classes.find(entry => entry.id === characterId) ||
    manifest.classes.find(entry => entry.id === DEFAULT_CHARACTER_ID);
  return { characterId: character.id, variantId: getDefaultVariant(character).id };
}

function validateCharacterConfiguration(value) {
  if (value === undefined) {
    return { ok: true, configuration: defaultCharacterConfiguration() };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Invalid character configuration." };
  }
  if (Object.keys(value).some(key => !["characterId", "variantId"].includes(key))) {
    return { ok: false, error: "Character configuration contains unsupported fields." };
  }

  const character = manifest.classes.find(entry => entry.id === value.characterId);
  if (!character) return { ok: false, error: "Invalid character selection." };

  if (value.variantId === undefined) {
    return {
      ok: true,
      configuration: {
        characterId: character.id,
        variantId: getDefaultVariant(character).id
      }
    };
  }

  const variant = character.variants.find(entry => entry.id === value.variantId);
  if (!variant) return { ok: false, error: "Invalid variant for this character." };
  return {
    ok: true,
    configuration: { characterId: character.id, variantId: variant.id }
  };
}

function normalizeJoinRequest(input) {
  if (typeof input === "string" || input == null) {
    return {
      ok: true,
      code: input ?? "",
      configuration: defaultCharacterConfiguration()
    };
  }
  if (typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key =>
        !["code", "characterId", "variantId"].includes(key))) {
    return { ok: false, error: "Invalid join request." };
  }

  const configured = validateCharacterConfiguration({
    characterId: input.characterId ?? DEFAULT_CHARACTER_ID,
    variantId: input.variantId
  });
  return { ...configured, code: input.code ?? "" };
}

module.exports = {
  DEFAULT_CHARACTER_ID,
  defaultCharacterConfiguration,
  normalizeJoinRequest,
  validateCharacterConfiguration
};
