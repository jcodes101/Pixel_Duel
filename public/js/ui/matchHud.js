import { requestRematch, submitMove } from "../network/socketClient.js";
import { getPlayerIdentityLabel } from "../game/assetLoader.mjs";

const MOVES = [
  { label: "Attack", key: "Attack", icon: [[7, 0, 3, 3], [8, 3, 3, 6], [6, 7, 4, 3], [4, 10, 3, 3], [2, 13, 3, 2]] },
  { label: "Defend", key: "Defend", icon: [[5, 1, 6, 2], [3, 3, 10, 3], [4, 6, 8, 3], [5, 9, 6, 3], [7, 12, 2, 2]] },
  { label: "Heal", key: "Heal", icon: [[6, 1, 4, 5], [3, 5, 10, 4], [6, 9, 4, 6]] },
  { label: "Special", key: "Special", icon: [[8, 0, 5, 3], [6, 3, 5, 4], [9, 7, 5, 3], [5, 10, 5, 4], [7, 14, 3, 2]] }
];

function createPixelIcon(move) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("move-button__icon");
  move.icon.forEach(([x, y, width, height]) => {
    const pixel = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    pixel.setAttribute("x", String(x));
    pixel.setAttribute("y", String(y));
    pixel.setAttribute("width", String(width));
    pixel.setAttribute("height", String(height));
    pixel.setAttribute("fill", "currentColor");
    svg.append(pixel);
  });
  return svg;
}

function appendMoveButtons(container, onSelect) {
  const buttons = new Map();
  MOVES.forEach(move => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.move = move.key;
    button.className = `move-button move-button--${move.key.toLowerCase()}`;
    button.setAttribute("aria-pressed", "false");
    button.append(createPixelIcon(move));

    const label = document.createElement("span");
    label.className = "move-button__label";
    label.textContent = move.label;
    const state = document.createElement("span");
    state.className = "move-button__state";
    state.setAttribute("aria-hidden", "true");
    button.append(label, state);
    button.addEventListener("click", () => onSelect(move.key));
    container.append(button);
    buttons.set(move.key, { button, state });
  });
  return buttons;
}

export function createMatchHud(mapVote, { onReturnToMenu = () => {} } = {}) {
  const status = document.querySelector("#match-status");
  const heading = document.querySelector("#match-heading");
  const roomLabel = document.querySelector("#match-room");
  const moveButtons = document.querySelector("#match-moves");
  const rematchButton = document.querySelector("#match-rematch");
  const returnButton = document.querySelector("#return-main-menu");
  const rematchStatus = document.querySelector("#match-rematch-status");
  const result = document.querySelector("#match-result");
  const resultTitle = document.querySelector("#match-result-title");
  const resultMap = document.querySelector("#game-over-map");
  const resultSummary = document.querySelector("#game-over-summary");
  const votePanel = document.querySelector("#map-vote-panel");
  const revealPanel = document.querySelector("#map-reveal-panel");
  const battleFrame = document.querySelector(".battle-frame");
  const roundIndicator = document.querySelector("#round-indicator");
  const selectedMapLabel = document.querySelector("#selected-map-label");
  const matchConnectionStatus = document.querySelector("#match-connection-status");
  const panels = [
    {
      name: document.querySelector("#player-one-name"),
      hp: document.querySelector("#player-one-hp"),
      meter: document.querySelector(".fighter-panel--p1 .health-meter"),
      fill: document.querySelector("#player-one-health-fill"),
      special: document.querySelector("#player-one-special")
    },
    {
      name: document.querySelector("#player-two-name"),
      hp: document.querySelector("#player-two-hp"),
      meter: document.querySelector(".fighter-panel--p2 .health-meter"),
      fill: document.querySelector("#player-two-health-fill"),
      special: document.querySelector("#player-two-special")
    }
  ];

  let latestState = null;
  let currentRound = null;
  let pendingMove = null;
  let moveSubmitting = false;
  let rematchSubmitting = false;
  let returnSubmitting = false;
  const moveButtonRefs = appendMoveButtons(moveButtons, handleMoveSelect);

  function getName(state, index) {
    const player = state.players[index];
    const character = state.manifest.classes.find(entry => entry.id === player?.characterId);
    const variant = character?.variants.find(entry => entry.id === player?.variantId);
    const identity = getPlayerIdentityLabel(index, state.you);
    if (!character) return `${identity} · Waiting`;
    return `${identity} · ${character.name}${variant ? ` / ${variant.name}` : ""}`;
  }

  function updatePlayerPanels(state) {
    panels.forEach((panel, index) => {
      const player = state.players[index];
      if (!player) {
        panel.name.textContent = `P${index + 1} · Waiting`;
        panel.hp.textContent = "-- / 100 HP";
        panel.meter.setAttribute("aria-valuenow", "0");
        panel.meter.setAttribute("aria-valuetext", "Waiting for player");
        panel.fill.style.transform = "scaleX(0)";
        panel.special.textContent = "SPECIAL · WAITING";
        return;
      }

      const hp = Math.max(0, Math.min(100, player.hp));
      panel.name.textContent = getName(state, index);
      panel.hp.textContent = `${hp} / 100 HP`;
      panel.meter.setAttribute("aria-valuenow", String(hp));
      panel.meter.setAttribute("aria-valuetext", `${hp} of 100 hit points`);
      panel.fill.style.transform = `scaleX(${hp / 100})`;
      panel.special.textContent = player.cooldown > 0
        ? `SPECIAL · ${player.cooldown} ROUND${player.cooldown === 1 ? "" : "S"}`
        : "SPECIAL · READY";
    });
  }

  function updateMoveButtons(state) {
    const me = state?.players?.[state.you];
    const canSelect = state?.phase === "SELECT" && Boolean(me);
    moveButtons.hidden = !canSelect;
    if (!canSelect) return;

    for (const move of MOVES) {
      const { button, state: buttonState } = moveButtonRefs.get(move.key);
      const cooldown = move.key === "Special" ? me.cooldown : 0;
      const selected = pendingMove === move.key;
      const locked = Boolean(me.locked);
      button.disabled = moveSubmitting || locked || cooldown > 0;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("move-button--locked", selected && locked);
      if (selected && moveSubmitting && !locked) buttonState.textContent = "SENDING MOVE...";
      else if (selected) buttonState.textContent = "YOUR MOVE · LOCKED";
      else if (locked) buttonState.textContent = "LOCKED · WAITING";
      else if (cooldown > 0) buttonState.textContent = `${cooldown} ROUND${cooldown === 1 ? "" : "S"} COOLDOWN`;
      else buttonState.textContent = "CHOOSE MOVE";
      button.setAttribute("aria-label", cooldown > 0
        ? `${move.label}, unavailable for ${cooldown} rounds`
        : selected && locked ? `${move.label}, locked in`
          : selected && moveSubmitting ? `${move.label}, submitting`
            : `Choose ${move.label}`);
    }
  }

  async function handleMoveSelect(move) {
    const me = latestState?.players?.[latestState.you];
    if (!latestState || latestState.phase !== "SELECT" || !me || me.locked ||
        moveSubmitting || !MOVES.some(entry => entry.key === move) ||
        (move === "Special" && me.cooldown > 0)) return;

    pendingMove = move;
    moveSubmitting = true;
    updateMoveButtons(latestState);
    try {
      await submitMove(move);
    } catch (error) {
      pendingMove = null;
      status.textContent = error.message;
    } finally {
      moveSubmitting = false;
      if (latestState) updateMoveButtons(latestState);
    }
  }

  function updateGameOver(state) {
    const gameOver = state.phase === "GAME_OVER";
    result.hidden = !gameOver;
    if (!gameOver) {
      rematchButton.disabled = false;
      rematchStatus.textContent = "";
      rematchButton.textContent = "Rematch";
      return;
    }

    const winner = state.result?.winner;
    resultTitle.textContent = winner === -1 ? "DRAW"
      : winner === state.you ? "VICTORY" : "DEFEAT";
    resultMap.textContent = `BATTLEFIELD · ${state.maps.find(map => map.id === state.mapId)?.name || "Unknown map"}`;
    resultSummary.replaceChildren();
    state.players.forEach((player, index) => {
      const card = document.createElement("article");
      card.className = `final-fighter final-fighter--p${index + 1}`;
      const label = document.createElement("span");
      label.className = "final-fighter__label";
      label.textContent = `P${index + 1}${index === state.you ? " · YOU" : " · OPPONENT"}`;
      const name = document.createElement("span");
      name.className = "final-fighter__name";
      name.textContent = getName(state, index).replace(/^P[12] \([^)]*\) · /, "");
      const hp = document.createElement("span");
      hp.className = "final-fighter__hp";
      hp.textContent = `FINAL HP · ${player.hp} / 100`;
      card.append(label, name, hp);
      resultSummary.append(card);
    });

    const votes = state.rematchVotes;
    rematchStatus.textContent = state.youRematchReady
      ? `YOUR REMATCH VOTE IS LOCKED · ${votes}/2 PLAYERS READY`
      : `${votes}/2 PLAYERS READY · BOTH MUST AGREE`;
    rematchButton.disabled = state.youRematchReady || rematchSubmitting;
    rematchButton.textContent = state.youRematchReady ? "Rematch Vote Locked" : "Rematch";
  }

  function render(state) {
    if (!state) return;
    latestState = state;
    if (state.round !== currentRound) {
      currentRound = state.round;
      pendingMove = null;
      moveSubmitting = false;
    }

    mapVote.render(state);
    roomLabel.textContent = `ROOM ${state.code}`;
    const mapName = state.maps.find(map => map.id === state.mapId)?.name;
    heading.textContent = state.phase === "MAP_VOTE" ? "CHOOSE THE BATTLEFIELD"
      : state.phase === "MAP_REVEAL" ? "THE MAP REVEAL" : mapName || "THE ARENA";
    roundIndicator.textContent = `ROUND ${state.round}`;
    selectedMapLabel.textContent = mapName ? `BATTLEFIELD · ${mapName}` : "BATTLEFIELD · VOTING";
    votePanel.hidden = state.phase !== "MAP_VOTE";
    revealPanel.hidden = state.phase !== "MAP_REVEAL";
    battleFrame.hidden = state.phase === "MAP_VOTE" || state.phase === "MAP_REVEAL";
    updatePlayerPanels(state);

    const me = state.players[state.you];
    const opponent = state.players[1 - state.you];
    status.textContent = state.phase === "WAITING" ? "WAITING FOR YOUR OPPONENT TO JOIN"
      : state.phase === "MAP_VOTE" ? "CHOOSE A MAP · VOTES STAY PRIVATE"
        : state.phase === "MAP_REVEAL" ? "BOTH VOTES ARE IN · REVEALING THE BATTLEFIELD"
          : state.phase === "RESOLVING" ? `ROUND ${state.round} · ${state.result?.outcome || "MOVES REVEALED"}`
            : state.phase === "GAME_OVER" ? "DUEL COMPLETE · REMATCH REQUIRES BOTH PLAYERS"
              : me?.locked ? "YOUR MOVE IS LOCKED · WAITING FOR OPPONENT"
                : opponent?.locked ? "OPPONENT IS READY · CHOOSE YOUR MOVE"
                  : "CHOOSE YOUR MOVE";

    if (state.phase !== "SELECT") pendingMove = null;
    updateMoveButtons(state);
    updateGameOver(state);
  }

  async function handleRematch() {
    if (rematchSubmitting || latestState?.phase !== "GAME_OVER" ||
        latestState.youRematchReady) return;
    rematchSubmitting = true;
    rematchButton.disabled = true;
    rematchStatus.textContent = "SENDING YOUR REMATCH VOTE...";
    try {
      await requestRematch();
    } catch (error) {
      rematchStatus.textContent = error.message;
    } finally {
      rematchSubmitting = false;
      if (latestState) updateGameOver(latestState);
    }
  }

  async function handleReturn() {
    if (returnSubmitting || latestState?.phase !== "GAME_OVER") return;
    returnSubmitting = true;
    returnButton.disabled = true;
    try {
      await onReturnToMenu();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      returnSubmitting = false;
      returnButton.disabled = false;
    }
  }

  rematchButton.addEventListener("click", handleRematch);
  returnButton.addEventListener("click", handleReturn);

  function setConnectionState(connectionState) {
    const labels = {
      connecting: "CONNECTING",
      connected: "CONNECTED",
      reconnecting: "RECONNECTING",
      disconnected: "DISCONNECTED"
    };
    const label = labels[connectionState] || "DISCONNECTED";
    matchConnectionStatus.textContent = label;
    matchConnectionStatus.dataset.state = connectionState;
  }

  function reset() {
    latestState = null;
    currentRound = null;
    pendingMove = null;
    moveSubmitting = false;
    rematchSubmitting = false;
    returnSubmitting = false;
    heading.textContent = "THE ARENA";
    roomLabel.textContent = "";
    status.textContent = "";
    votePanel.hidden = true;
    revealPanel.hidden = true;
    battleFrame.hidden = false;
    result.hidden = true;
    rematchButton.disabled = false;
    rematchButton.textContent = "Rematch";
    returnButton.disabled = false;
    moveButtons.hidden = true;
    resultSummary.replaceChildren();
    mapVote.reset?.();
  }

  return { render, reset, setConnectionState };
}
