import { drawCharacterArt, startIdlePreview } from "../game/characterPreview.mjs";
import { isValidCharacterConfiguration } from "../game/assetLoader.mjs";

const STORAGE_KEY = "pixel-duel.character-preferences";

function defaultConfiguration(manifest) {
  const character = manifest.characters[0];
  return {
    characterId: character.id,
    cosmetics: {
      accentColor: Object.keys(character.cosmetics.accentColor)[0],
      headgear: character.cosmetics.headgear[0],
      accessory: character.cosmetics.accessory[0]
    }
  };
}

function readSavedConfiguration(manifest) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultConfiguration(manifest);
    const parsed = JSON.parse(stored);
    return isValidCharacterConfiguration(manifest, parsed)
      ? structuredClone(parsed)
      : defaultConfiguration(manifest);
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

function titleCase(value) {
  return value.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export function createCharacterSelect(manifest, onChange = () => {}) {
  const cardList = document.querySelector("#character-cards");
  const name = document.querySelector("#selected-character-name");
  const description = document.querySelector("#selected-character-description");
  const accent = document.querySelector("#accent-color");
  const headgear = document.querySelector("#headgear");
  const accessory = document.querySelector("#accessory");
  const preview = document.querySelector("#character-preview");
  let configuration = readSavedConfiguration(manifest);
  let activeCharacter = manifest.characters.find(entry => entry.id === configuration.characterId);

  const stopPreview = startIdlePreview(
    preview,
    () => configuration,
    () => activeCharacter
  );

  function populateSelect(select, values, selected, labelForValue = titleCase) {
    select.replaceChildren();
    values.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = labelForValue(value);
      select.append(option);
    });
    select.value = selected;
  }

  function updateCosmeticOptions() {
    populateSelect(accent, Object.keys(activeCharacter.cosmetics.accentColor),
      configuration.cosmetics.accentColor);
    populateSelect(headgear, activeCharacter.cosmetics.headgear, configuration.cosmetics.headgear);
    populateSelect(accessory, activeCharacter.cosmetics.accessory,
      configuration.cosmetics.accessory);
  }

  function updateSelection(nextCharacterId) {
    activeCharacter = manifest.characters.find(entry => entry.id === nextCharacterId);
    configuration = {
      characterId: activeCharacter.id,
      cosmetics: {
        accentColor: Object.hasOwn(activeCharacter.cosmetics.accentColor,
          configuration.cosmetics.accentColor)
          ? configuration.cosmetics.accentColor
          : Object.keys(activeCharacter.cosmetics.accentColor)[0],
        headgear: activeCharacter.cosmetics.headgear.includes(configuration.cosmetics.headgear)
          ? configuration.cosmetics.headgear
          : activeCharacter.cosmetics.headgear[0],
        accessory: activeCharacter.cosmetics.accessory.includes(configuration.cosmetics.accessory)
          ? configuration.cosmetics.accessory
          : activeCharacter.cosmetics.accessory[0]
      }
    };

    name.textContent = activeCharacter.name;
    description.textContent = activeCharacter.description;
    cardList.querySelectorAll("button[data-character-id]").forEach(card => {
      const selected = card.dataset.characterId === activeCharacter.id;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
    updateCosmeticOptions();
    saveConfiguration(configuration);
    onChange(structuredClone(configuration));
  }

  manifest.characters.forEach(character => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "character-card";
    card.dataset.characterId = character.id;
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", `Select ${character.name}`);

    const portrait = document.createElement("canvas");
    portrait.width = 64;
    portrait.height = 64;
    portrait.className = "character-card__portrait";
    portrait.setAttribute("aria-hidden", "true");
    const portraitContext = portrait.getContext("2d");
    drawCharacterArt(portraitContext, character, {
      cosmetics: {
        accentColor: Object.keys(character.cosmetics.accentColor)[0],
        headgear: character.cosmetics.headgear[0],
        accessory: character.cosmetics.accessory[0]
      }
    });

    const title = document.createElement("span");
    title.className = "character-card__name";
    title.textContent = character.name;
    card.append(portrait, title);
    card.addEventListener("click", () => updateSelection(character.id));
    cardList.append(card);
  });

  accent.addEventListener("change", () => {
    configuration.cosmetics.accentColor = accent.value;
    updateSelection(activeCharacter.id);
  });
  headgear.addEventListener("change", () => {
    configuration.cosmetics.headgear = headgear.value;
    updateSelection(activeCharacter.id);
  });
  accessory.addEventListener("change", () => {
    configuration.cosmetics.accessory = accessory.value;
    updateSelection(activeCharacter.id);
  });

  updateSelection(configuration.characterId);
  return {
    getConfiguration: () => structuredClone(configuration),
    stop: stopPreview
  };
}
