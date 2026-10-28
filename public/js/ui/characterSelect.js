import {
  isValidCharacterConfiguration,
  normalizeSavedCharacterConfiguration
} from "../game/assetLoader.mjs";
import { drawCharacterArt, startIdlePreview } from "../game/characterPreview.mjs";

const STORAGE_KEY = "pixel-duel.character-preferences";

function defaultConfiguration(manifest) {
  const character = manifest.classes[0];
  return { characterId: character.id, variantId: character.variants[0].id };
}

function readSavedConfiguration(manifest) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultConfiguration(manifest);
    return normalizeSavedCharacterConfiguration(manifest, JSON.parse(stored));
  } catch {
    return defaultConfiguration(manifest);
  }
}

function saveConfiguration(configuration) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration));
  } catch (error) {
    console.warn("Could not save character preferences locally.", error);
  }
}

export function createCharacterSelect(manifest, onChange = () => {}) {
  const cardList = document.querySelector("#character-cards");
  const variantList = document.querySelector("#variant-cards");
  const name = document.querySelector("#selected-character-name");
  const variantName = document.querySelector("#selected-variant-name");
  const description = document.querySelector("#selected-character-description");
  const preview = document.querySelector("#character-preview");
  let configuration = readSavedConfiguration(manifest);
  let activeCharacter = manifest.classes.find(entry => entry.id === configuration.characterId);
  let activeVariant = activeCharacter.variants.find(entry => entry.id === configuration.variantId);

  const stopPreview = startIdlePreview(
    preview,
    () => configuration,
    () => activeCharacter
  );

  function publishConfiguration() {
    saveConfiguration(configuration);
    onChange(structuredClone(configuration));
  }

  function updateVariantCards() {
    variantList.replaceChildren();
    activeCharacter.variants.forEach(variant => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "variant-card";
      button.dataset.variantId = variant.id;
      button.setAttribute("aria-pressed", String(variant.id === activeVariant.id));
      button.setAttribute("aria-label", `Select ${variant.name} variant`);

      const portrait = document.createElement("canvas");
      portrait.width = 80;
      portrait.height = 80;
      portrait.className = "variant-card__portrait";
      portrait.setAttribute("aria-hidden", "true");
      drawCharacterArt(portrait.getContext("2d"), activeCharacter,
        { characterId: activeCharacter.id, variantId: variant.id }, 0, {
          action: "idle",
          centerX: 40,
          baseline: 75
        });

      const label = document.createElement("span");
      label.className = "variant-card__name";
      label.textContent = variant.name;
      button.append(portrait, label);
      button.addEventListener("click", () => updateVariant(variant.id));
      variantList.append(button);
    });
  }

  function updateVariant(nextVariantId) {
    activeVariant = activeCharacter.variants.find(entry => entry.id === nextVariantId) ||
      activeCharacter.variants[0];
    configuration = { characterId: activeCharacter.id, variantId: activeVariant.id };
    variantName.textContent = activeVariant.name;
    variantList.querySelectorAll("button[data-variant-id]").forEach(button => {
      const selected = button.dataset.variantId === activeVariant.id;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    publishConfiguration();
  }

  function updateCharacter(nextCharacterId) {
    activeCharacter = manifest.classes.find(entry => entry.id === nextCharacterId) ||
      manifest.classes[0];
    activeVariant = activeCharacter.variants.find(entry =>
      entry.id === configuration.variantId) || activeCharacter.variants[0];
    configuration = { characterId: activeCharacter.id, variantId: activeVariant.id };

    name.textContent = activeCharacter.name;
    description.textContent = activeCharacter.description;
    cardList.querySelectorAll("button[data-character-id]").forEach(button => {
      const selected = button.dataset.characterId === activeCharacter.id;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateVariantCards();
    variantName.textContent = activeVariant.name;
    publishConfiguration();
  }

  manifest.classes.forEach(character => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-card";
    button.dataset.characterId = character.id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Select ${character.name} class`);

    const portrait = document.createElement("canvas");
    portrait.width = 64;
    portrait.height = 64;
    portrait.className = "character-card__portrait";
    portrait.setAttribute("aria-hidden", "true");
    drawCharacterArt(portrait.getContext("2d"), character, {
      characterId: character.id,
      variantId: character.variants[0].id
    }, 0, { action: "idle", centerX: 32, baseline: 62 });

    const title = document.createElement("span");
    title.className = "character-card__name";
    title.textContent = character.name;
    button.append(portrait, title);
    button.addEventListener("click", () => updateCharacter(character.id));
    cardList.append(button);
  });

  if (!isValidCharacterConfiguration(manifest, configuration)) {
    configuration = defaultConfiguration(manifest);
  }
  updateCharacter(configuration.characterId);
  updateVariant(configuration.variantId);

  return {
    getConfiguration: () => structuredClone(configuration),
    stop: stopPreview
  };
}
