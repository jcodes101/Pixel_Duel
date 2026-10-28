import { loadCharacterManifest } from "./game/assetLoader.mjs";
import { createBattleCanvas } from "./game/canvas.js";
import {
  joinRoom,
  onConnectionChange,
  onOpponentLeft,
  onState
} from "./network/socketClient.js";
import { createCharacterSelect } from "./ui/characterSelect.js";
import { createLobby } from "./ui/lobby.js";
import { createMatchHud } from "./ui/matchHud.js";

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
  const manifest = await loadCharacterManifest();
  characterSelect = createCharacterSelect(manifest);
  matchHud = createMatchHud();
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
    gameState = { ...snapshot, manifest };
    matchHud.render(gameState);
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
  console.error("Pixel Duel could not load its character data.", error);
  document.querySelector("#startup-error").textContent =
    "The character roster could not be loaded. Refresh to try again.";
  document.querySelector("#startup-error").hidden = false;
});
