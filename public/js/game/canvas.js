import { drawCharacterArt } from "./characterPreview.mjs";

const COLORS = {
  background: "#171725",
  far: "#222438",
  ground: "#394052",
  gold: "#f0ca7a",
  p1: "#68c5bc",
  p2: "#e78378"
};

function drawBackground(context, time, width, height) {
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, width, height);
  for (let i = 0; i < 36; i++) {
    const x = (i * 73 + Math.floor(time * (i % 3 + 1))) % width;
    const y = (i * 41) % 158;
    context.fillStyle = i % 4 === 0 ? "#807ba0" : COLORS.far;
    context.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
  }
  context.fillStyle = "#242b3a";
  context.fillRect(0, 170, width, height - 170);
  context.fillStyle = COLORS.ground;
  context.fillRect(0, 169, width, 3);
  for (let i = 0; i < 18; i++) {
    context.fillStyle = i % 2 ? "#242b3a" : "#303849";
    context.fillRect(i * 29, 206 + (i % 3) * 13, 18, 4);
  }
}

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
  let frame = 0;
  let previousTime = 0;
  let elapsed = 0;
  let running = true;

  function draw(timestamp) {
    if (!running || document.hidden) {
      frame = 0;
      return;
    }
    if (previousTime) elapsed += Math.min(64, timestamp - previousTime) / 1000;
    previousTime = timestamp;
    context.imageSmoothingEnabled = false;
    drawBackground(context, elapsed, canvas.width, canvas.height);
    const state = getState();
    if (state) {
      const renderState = { ...state, manifest: state.manifest };
      state.players.forEach((player, index) => drawHealth(context, player, index,
        index === 0 ? 46 : 326, renderState, elapsed));
      if (state.phase === "WAITING" && state.players.length < 2) {
        context.fillStyle = "#c8c0ae";
        context.font = "12px monospace";
        context.textAlign = "center";
        context.fillText("Waiting for another challenger...", 240, 108);
      }
    }
    frame = requestAnimationFrame(draw);
  }

  function onVisibilityChange() {
    if (!document.hidden && running && !frame) {
      previousTime = 0;
      frame = requestAnimationFrame(draw);
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  frame = requestAnimationFrame(draw);
  return () => {
    running = false;
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
