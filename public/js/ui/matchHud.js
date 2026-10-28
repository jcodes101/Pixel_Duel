import { requestRematch, submitMove } from "../network/socketClient.js";
import { getPlayerIdentityLabel } from "../game/assetLoader.mjs";

const MOVES = ["Attack", "Defend", "Heal", "Special"];

export function createMatchHud() {
  const status = document.querySelector("#match-status");
  const roomLabel = document.querySelector("#match-room");
  const identity = document.querySelector("#player-identity");
  const moveButtons = document.querySelector("#match-moves");
  const rematchButton = document.querySelector("#match-rematch");
  const rematchStatus = document.querySelector("#match-rematch-status");
  const result = document.querySelector("#match-result");

  function render(state) {
    if (!state) return;
    roomLabel.textContent = `ROOM ${state.code} · ROUND ${state.round}`;
    identity.replaceChildren();
    const localIndex = state.you;
    [localIndex, 1 - localIndex].forEach(index => {
      const player = state.players[index];
      const label = document.createElement("span");
      label.className = `identity-chip identity-chip--p${index + 1}`;
      label.textContent = getPlayerIdentityLabel(index, localIndex);
      if (player?.characterId) {
        const character = state.manifest.characters.find(entry =>
          entry.id === player.characterId);
        label.textContent += ` · ${character?.name || "Fighter"}`;
      } else {
        label.textContent += " · Waiting";
      }
      identity.append(label);
    });

    const me = state.players[localIndex];
    const opponent = state.players[1 - localIndex];
    status.textContent = state.phase === "WAITING" ? "Waiting for your opponent to join..."
      : state.phase === "RESOLVING" ? "Both moves revealed · Resolving..."
        : state.phase === "GAME_OVER" ? "Duel complete · Rematch requires both players"
          : me.locked ? "Your move is locked · Waiting for opponent"
            : opponent?.locked ? "Opponent is ready · Choose your move"
              : "Choose your move";

    moveButtons.replaceChildren();
    if (state.phase === "SELECT") {
      MOVES.forEach(move => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = move +
          (move === "Special" && me.cooldown ? ` · ${me.cooldown}` : "");
        button.disabled = me.locked || (move === "Special" && me.cooldown > 0);
        button.addEventListener("click", () => {
          button.disabled = true;
          submitMove(move);
        });
        moveButtons.append(button);
      });
    }

    const gameOver = state.phase === "GAME_OVER";
    result.hidden = !gameOver;
    rematchButton.hidden = !gameOver;
    if (gameOver && state.result) {
      const won = state.result.winner === -1 ? "DRAW"
        : state.result.winner === state.you ? "VICTORY" : "DEFEAT";
      document.querySelector("#match-result-title").textContent = won;
    }
    if (gameOver) {
      rematchStatus.textContent = `${state.rematchVotes}/2 ready`;
      rematchButton.disabled = state.youRematchReady;
    } else {
      rematchStatus.textContent = "";
      rematchButton.disabled = false;
    }
  }

  rematchButton.addEventListener("click", () => requestRematch());
  return { render };
}
