import {
  loadCharacterManifest,
  preloadCharacterAnimations
} from "./game/assetLoader.mjs";
import { createBattleCanvas } from "./game/canvas.js";
import { loadMapManifest } from "./game/maps.mjs";
import {
  joinRoom,
  leaveRoom,
  onConnectionChange,
  onOpponentLeft,
  onRoomInterrupted,
  onState,
  submitMapVote
} from "./network/socketClient.js";
import { createCharacterSelect } from "./ui/characterSelect.js";
import { createGameMenu } from "./ui/gameMenu.js";
import { createLobby } from "./ui/lobby.js";
import { createMatchHud } from "./ui/matchHud.js";
import { createMapVote } from "./ui/mapVote.js";

const menuScreen = document.querySelector("#menu-screen");
const matchScreen = document.querySelector("#match-screen");
const menuError = document.querySelector("#menu-error");
const connectionStatus = document.querySelector("#connection-status");
let gameState = null;
let characterSelect;
let lobby;
let matchHud;
let gameMenu;
let stopBattleCanvas;

function setConnectionStatus(state) {
  const labels = {
    connecting: "Connecting to the arena...",
    connected: "Connected · ready to duel",
    reconnecting: "Connection interrupted · reconnecting...",
    disconnected: "Disconnected from the arena."
  };
  if (connectionStatus) {
    connectionStatus.textContent = labels[state] || labels.disconnected;
    connectionStatus.dataset.state = state;
  }
  matchHud?.setConnectionState(state);
}

function showMenu(message = "") {
  gameMenu?.close();
  gameState = null;
  matchHud?.reset();
  stopBattleCanvas?.stateChanged();
  matchScreen.hidden = true;
  menuScreen.hidden = false;
  menuError.textContent = message;
  lobby?.setStatus(message, message ? "notice" : "neutral");
  lobby?.setBusy(false);
}

function showMatch() {
  menuError.textContent = "";
  menuScreen.hidden = true;
  matchScreen.hidden = false;
  lobby?.setBusy(false);
}

async function leaveCurrentRoom(message = "You left the room.") {
  await leaveRoom();
  showMenu(message);
}

async function initialize() {
  const [manifest, maps] = await Promise.all([
    loadCharacterManifest(),
    loadMapManifest()
  ]);
  characterSelect = createCharacterSelect(manifest);
  const mapVote = createMapVote(maps, submitMapVote);
  matchHud = createMatchHud(mapVote, {
    onReturnToMenu: () => leaveCurrentRoom("You left the duel. Your character preferences are saved.")
  });
  gameMenu = createGameMenu(() => leaveCurrentRoom("You left the duel. Your character preferences are saved."));
  stopBattleCanvas = createBattleCanvas(
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
    if (!matchScreen.hidden) showMatch();
  });

  onOpponentLeft(() => {
    showMenu("Your opponent left the room. You can create or join another duel.");
  });

  onRoomInterrupted(() => {
    showMenu("The connection interrupted this match. Rejoin by creating or joining a room.");
  });

  onConnectionChange(setConnectionStatus);
}

initialize().catch(error => {
  console.error("Pixel Duel could not load its game data.", error);
  document.querySelector("#startup-error").textContent =
    "Game data could not be loaded. Refresh to try again.";
  document.querySelector("#startup-error").hidden = false;
});
