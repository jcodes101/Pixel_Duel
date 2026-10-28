import { resolveAnimation } from "./assetLoader.mjs";

const MISSING_ART = {
  primary: "#766c8d",
  dark: "#282a39",
  light: "#ddd5c2"
};

const CLASS_EFFECTS = {
  ninja: "#8fe0c0",
  samurai: "#f2c66f",
  knight: "#9cc6e8",
  wizard: "#c8a4f5",
  skeleton: "#a8d47a",
  yokai: "#f08cb9"
};

function getVariant(character, configuration) {
  return character?.variants.find(variant => variant.id === configuration?.variantId) ||
    character?.variants[0] || null;
}

function getFrameIndex(clip, elapsedMs) {
  if (!clip || clip.frameCount <= 1) return 0;
  const rawFrame = Math.floor(Math.max(0, elapsedMs) / clip.frameDurationMs);
  return clip.loop ? rawFrame % clip.frameCount : Math.min(clip.frameCount - 1, rawFrame);
}

export function getAnimationDuration(variant, action) {
  const resolved = resolveAnimation(variant, action);
  return resolved ? resolved.clip.frameCount * resolved.clip.frameDurationMs : 0;
}

function drawMissingArt(context, centerX, baseline) {
  context.fillStyle = "#171923";
  context.fillRect(Math.round(centerX - 17), Math.round(baseline - 8), 34, 7);
  context.fillStyle = MISSING_ART.dark;
  context.fillRect(Math.round(centerX - 11), Math.round(baseline - 27), 22, 19);
  context.fillRect(Math.round(centerX - 8), Math.round(baseline - 42), 16, 15);
  context.fillStyle = MISSING_ART.primary;
  context.fillRect(Math.round(centerX - 13), Math.round(baseline - 31), 26, 12);
  context.fillRect(Math.round(centerX - 9), Math.round(baseline - 48), 18, 9);
  context.fillStyle = MISSING_ART.light;
  context.fillRect(Math.round(centerX - 5), Math.round(baseline - 38), 3, 2);
  context.fillRect(Math.round(centerX + 2), Math.round(baseline - 38), 3, 2);
}

export function drawCharacterArt(
  context,
  character,
  configuration,
  time = 0,
  options = {}
) {
  const variant = getVariant(character, configuration);
  if (!variant) return { complete: false, variant: null, fallback: true };

  const action = options.action || "idle";
  const resolved = resolveAnimation(variant, action, true) ||
    resolveAnimation(variant, "idle", true);
  const centerX = options.centerX ?? 0;
  const baseline = options.baseline ?? 0;
  if (!resolved?.clip.image) {
    drawMissingArt(context, centerX, baseline);
    return { complete: false, variant, fallback: true };
  }

  const clip = resolved.clip;
  const elapsedMs = Math.max(0, options.elapsedMs ?? time * 1000);
  const frameIndex = getFrameIndex(clip, elapsedMs);
  const complete = !clip.loop && elapsedMs >= clip.frameCount * clip.frameDurationMs;
  const sourceX = frameIndex * clip.frameWidth;
  const offsetX = clip.offset?.x || 0;
  const offsetY = clip.offset?.y || 0;
  const scale = variant.displayScale * (options.scaleMultiplier || 1);
  const facesRight = variant.facing === "right";
  const shouldFaceRight = options.shouldFaceRight ?? true;
  const flipX = facesRight !== shouldFaceRight;

  context.save();
  context.translate(Math.round(centerX), Math.round(baseline));
  context.scale((flipX ? -1 : 1) * scale, scale);
  context.drawImage(clip.image,
    sourceX, 0, clip.frameWidth, clip.frameHeight,
    -clip.frameWidth / 2 + offsetX, -clip.frameHeight + offsetY,
    clip.frameWidth, clip.frameHeight);
  context.restore();

  if (complete && typeof options.onComplete === "function") options.onComplete(action);
  return { complete, variant, animationId: resolved.animationId, fallback: resolved.fallback };
}

export function drawMoveEffect(context, effect) {
  if (!effect) return;
  const {
    action,
    characterId,
    centerX,
    baseline,
    facing,
    elapsedMs = 0,
    reducedMotion = false,
    shieldFallback = false,
    hit = false
  } = effect;
  const color = CLASS_EFFECTS[characterId] || "#e9c67b";
  const pulse = reducedMotion ? 0 : Math.round(Math.sin(elapsedMs / 66) * 2);

  if (action === "heal") {
    context.save();
    context.globalAlpha = reducedMotion ? 0.72 : 0.38 + Math.abs(Math.sin(elapsedMs / 190)) * 0.5;
    context.strokeStyle = "#8de08d";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(Math.round(centerX), Math.round(baseline - 34 - pulse), 12 + Math.abs(pulse), 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#a4f28e";
    for (let i = 0; i < 4; i++) {
      const x = Math.round(centerX - 13 + i * 9);
      const y = Math.round(baseline - 20 - ((elapsedMs / 42 + i * 7) % 25));
      context.fillRect(x, y, 2, 3);
    }
    context.restore();
  }

  if (action === "defend" && shieldFallback) {
    const x = Math.round(centerX - facing * 22);
    const y = Math.round(baseline - 45);
    context.save();
    context.globalAlpha = reducedMotion ? 0.8 : 0.52 + Math.abs(pulse) * 0.08;
    context.fillStyle = "#8fcee0";
    context.fillRect(x - 6, y + 1, 12, 17);
    context.fillRect(x - 4, y - 2, 8, 3);
    context.fillRect(x - 4, y + 18, 8, 3);
    context.fillStyle = "#d5edf0";
    context.fillRect(x - 1, y + 4, 2, 10);
    context.restore();
  }

  if ((action === "attack" || action === "special") && elapsedMs < 650) {
    const swing = reducedMotion ? 0 : Math.max(0, Math.sin(Math.min(1, elapsedMs / 650) * Math.PI));
    const x = Math.round(centerX + facing * (25 + swing * 14));
    const y = Math.round(baseline - 41 + pulse);
    context.save();
    context.globalAlpha = reducedMotion ? 0.56 : Math.max(0, 0.72 - elapsedMs / 940);
    context.fillStyle = action === "special" ? color : "#f4e6c5";
    context.fillRect(x, y, 11, 2);
    context.fillRect(x + facing * 4, y - 4, 7, 2);
    context.fillRect(x + facing * 7, y + 4, 6, 2);
    context.restore();
  }

  if (hit) {
    context.save();
    context.globalAlpha = reducedMotion ? 0.55 : Math.max(0.15, 0.58 - elapsedMs / 1900);
    context.fillStyle = "#fff4dc";
    context.fillRect(Math.round(centerX - 9), Math.round(baseline - 48), 3, 3);
    context.fillRect(Math.round(centerX + 8), Math.round(baseline - 37), 2, 2);
    context.restore();
  }

  if (action === "victory") {
    context.save();
    context.fillStyle = "#f4d27e";
    context.globalAlpha = reducedMotion ? 0.72 : 0.45 + Math.abs(pulse) * 0.12;
    for (let i = 0; i < 5; i++) {
      const x = Math.round(centerX - 16 + ((elapsedMs / 36 + i * 13) % 32));
      const y = Math.round(baseline - 56 - ((elapsedMs / 32 + i * 9) % 22));
      context.fillRect(x, y, 2, 3);
    }
    context.restore();
  }
}

export function startIdlePreview(canvas, getConfiguration, getCharacter) {
  const context = canvas.getContext("2d");
  let animationFrame = 0;
  let previousTime = 0;
  let elapsed = 0;
  let active = true;

  function draw(timestamp) {
    if (!active || document.hidden) {
      animationFrame = 0;
      return;
    }
    if (previousTime) elapsed += Math.min(64, timestamp - previousTime) / 1000;
    previousTime = timestamp;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#141421";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 13; i++) {
      const x = (i * 37 + 19) % canvas.width;
      const y = (i * 29 + Math.floor(elapsed * (i % 3 + 1))) % canvas.height;
      context.fillStyle = i % 3 === 0 ? "#554b71" : "#374458";
      context.fillRect(x, y, 2, 2);
    }
    context.fillStyle = "#293244";
    context.fillRect(0, canvas.height - 14, canvas.width, 14);
    context.fillStyle = "#6b6a85";
    context.fillRect(0, canvas.height - 15, canvas.width, 2);

    drawCharacterArt(context, getCharacter(), getConfiguration(), elapsed, {
      action: "idle",
      centerX: canvas.width / 2,
      baseline: canvas.height - 15,
      scaleMultiplier: 1.45
    });
    animationFrame = requestAnimationFrame(draw);
  }

  function onVisibilityChange() {
    if (!document.hidden && active && !animationFrame) {
      previousTime = 0;
      animationFrame = requestAnimationFrame(draw);
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  animationFrame = requestAnimationFrame(draw);
  return () => {
    active = false;
    cancelAnimationFrame(animationFrame);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
