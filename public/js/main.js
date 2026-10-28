import {
  loadCharacterManifest,
  preloadCharacterAnimations
} from "./game/assetLoader.mjs";
import { createBattleCanvas } from "./game/canvas.js";
import { loadMapManifest } from "./game/maps.mjs";
import {
  joinRoom,
  onConnectionChange,
  onOpponentLeft,
  onState,
  submitMapVote
} from "./network/socketClient.js";
import { createCharacterSelect } from "./ui/characterSelect.js";
import { createLobby } from "./ui/lobby.js";
import { createMatchHud } from "./ui/matchHud.js";
import { createMapVote } from "./ui/mapVote.js";

const menuScreen = document.querySelector("#menu-screen");
const matchScreen = document.querySelector("#match-screen");
const menuError = document.querySelector("#menu-error");
let gameState = null;
let characterSelect;
let lobby;
let matchHud;

function showMenu(message = "") {
  matchScreen.hidden = true;
  menuScreen.hidden = false;
  if (message) {
    menuError.textContent = message;
    lobby?.setStatus(message, "error");
  }
  lobby?.setBusy(false);
}

function showMatch() {
  menuScreen.hidden = true;
  matchScreen.hidden = false;
}

async function initialize() {
  const [manifest, maps] = await Promise.all([
    loadCharacterManifest(),
    loadMapManifest()
  ]);
  characterSelect = createCharacterSelect(manifest);
  const mapVote = createMapVote(maps, submitMapVote);
  matchHud = createMatchHud(mapVote);
  const stopBattleCanvas = createBattleCanvas(
    document.querySelector("#battlefield"),
    () => gameState
  );
  window.addEventListener("pagehide", stopBattleCanvas, { once: true });

  lobby = createLobby(async code => {
    await joinRoom(code, characterSelect.getConfiguration());
    showMatch();
  });

  onState(snapshot => {
    gameState = { ...snapshot, manifest, maps };
    snapshot.players.forEach(player => {
      if (player?.characterId && player?.variantId) {
        preloadCharacterAnimations(manifest, player.characterId, player.variantId);
      }
    });
    matchHud.render(gameState);
    stopBattleCanvas.stateChanged();
    if (snapshot.phase === "WAITING") {
      lobby.setStatus(`Room ${snapshot.code} · Waiting for a challenger`, "waiting");
    }
    if (!matchScreen.hidden) showMatch();
  });

  onOpponentLeft(() => {
    gameState = null;
    showMenu("Your opponent left the room. You can create or join another duel.");
  });

  onConnectionChange(connected => {
    if (connected && !menuScreen.hidden) {
      lobby.setStatus("Connected · ready to duel", "connected");
    } else if (!connected && !matchScreen.hidden) {
      gameState = null;
      showMenu("Connection lost. Reconnect and join a room to continue.");
    }
  });
}

initialize().catch(error => {
  console.error("Pixel Duel could not load its game data.", error);
  document.querySelector("#startup-error").textContent =
    "Game data could not be loaded. Refresh to try again.";
  document.querySelector("#startup-error").hidden = false;
});
