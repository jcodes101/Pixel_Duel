import { drawCharacterArt } from "./characterPreview.mjs";
import { getMapById } from "./maps.js";
import { createMapRenderer } from "./mapRenderer.js";

const COLORS = {
  gold: "#f0ca7a",
  p1: "#68c5bc",
  p2: "#e78378"
};

function drawHealth(context, player, playerIndex, x, state, time) {
  const accent = playerIndex === 0 ? COLORS.p1 : COLORS.p2;
  const label = playerIndex === state.you ? `P${playerIndex + 1} (You)` :
    `P${playerIndex + 1} (Opponent)`;
  context.fillStyle = accent;
  context.font = "bold 12px monospace";
  context.textAlign = "left";
  context.fillText(label, x, 26);
  context.fillStyle = "#302e42";
  context.fillRect(x, 36, 132, 11);
  context.fillStyle = accent;
  context.fillRect(x + 2, 38, 128 * Math.max(0, player.hp) / 100, 7);
  context.fillStyle = "#eee7d2";
  context.font = "10px monospace";
  context.fillText(`${player.hp} HP`, x, 61);

  const character = state.manifest.characters.find(entry =>
    entry.id === player.characterId);
  context.save();
  context.translate(playerIndex === 0 ? 80 : 360, 152);
  if (playerIndex === 1) {
    context.translate(64, 0);
    context.scale(-1, 1);
  }
  drawCharacterArt(context, character, { cosmetics: player.cosmetics }, time);
  context.restore();

  if (state.phase === "RESOLVING" && state.result) {
    const damage = state.result.damage[playerIndex];
    if (damage > 0) {
      context.fillStyle = COLORS.gold;
      context.font = "bold 13px monospace";
      context.fillText(`-${damage}`, playerIndex === 0 ? 128 : 384, 105 + Math.sin(time * 8) * 3);
    }
  }
}

export function createBattleCanvas(canvas, getState) {
  const context = canvas.getContext("2d");
  const mapRenderer = createMapRenderer(context);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let previousTime = 0;
  let elapsed = 0;
  let running = true;

  function draw(timestamp) {
    frame = 0;
    if (!running || document.hidden) return;
    const state = getState();
    if (!state || !["WAITING", "SELECT", "RESOLVING", "GAME_OVER"].includes(state.phase)) return;
    const delta = previousTime ? Math.min(64, timestamp - previousTime) / 1000 : 0;
    elapsed += delta;
    previousTime = timestamp;
    context.imageSmoothingEnabled = false;
    mapRenderer.draw(getMapById(state.maps, state.mapId), elapsed, delta,
      reducedMotion.matches);
    state.players.forEach((player, index) => drawHealth(context, player, index,
      index === 0 ? 46 : 326, state, elapsed));
    frame = requestAnimationFrame(draw);
  }

  function scheduleFrame() {
    const state = getState();
    if (running && !document.hidden && state &&
        ["WAITING", "SELECT", "RESOLVING", "GAME_OVER"].includes(state.phase) && !frame) {
      previousTime = 0;
      frame = requestAnimationFrame(draw);
    }
  }

  function onVisibilityChange() {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else scheduleFrame();
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  const stop = () => {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
  stop.stateChanged = scheduleFrame;
  return stop;
}
