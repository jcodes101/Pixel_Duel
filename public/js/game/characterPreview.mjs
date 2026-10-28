function pixel(context, x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function getAccent(character, cosmetics) {
  return character.cosmetics.accentColor[cosmetics?.accentColor] || character.palette.accent;
}

function drawHeadgear(context, character, headgear, accent) {
  const metal = character.palette.metal;
  const dark = character.palette.shadow;
  switch (headgear) {
    case "closed-helm":
    case "open-helm":
    case "winged-helm":
    case "iron-cap":
    case "horned-helm":
      pixel(context, 22, 7, 20, 7, metal);
      pixel(context, 19, 12, 26, 4, metal);
      pixel(context, 23, 16, 18, 3, dark);
      pixel(context, 27, 16, 3, 2, accent);
      if (headgear === "winged-helm") {
        pixel(context, 16, 4, 8, 3, accent);
        pixel(context, 40, 4, 8, 3, accent);
      }
      if (headgear === "horned-helm") {
        pixel(context, 15, 5, 5, 3, metal);
        pixel(context, 44, 5, 5, 3, metal);
      }
      break;
    case "wide-brim":
    case "short-brim":
      pixel(context, 21, 5, 22, 7, dark);
      pixel(context, headgear === "wide-brim" ? 11 : 17, 12,
        headgear === "wide-brim" ? 42 : 30, 3, character.palette.primary);
      pixel(context, 24, 9, 15, 3, accent);
      break;
    case "hood":
    case "deep-hood":
    case "shadow-hood":
    case "open-hood":
      pixel(context, 19, 5, 27, 7, character.palette.primary);
      pixel(context, 16, 11, 6, 9, character.palette.primary);
      pixel(context, 43, 11, 6, 9, character.palette.primary);
      pixel(context, 23, 15, 19, 4, dark);
      break;
    case "face-wrap":
    case "half-mask":
    case "bandana":
    case "bone-mask":
      pixel(context, 21, 14, 23, 6, accent);
      break;
    case "headband":
      pixel(context, 19, 11, 28, 4, accent);
      pixel(context, 43, 12, 10, 2, accent);
      pixel(context, 49, 14, 4, 7, accent);
      break;
    case "star-circlet":
      pixel(context, 21, 8, 23, 3, metal);
      pixel(context, 29, 4, 6, 5, accent);
      pixel(context, 31, 2, 2, 3, "#fff0a8");
      break;
    case "braided-hair":
    case "tied-hair":
      pixel(context, 20, 7, 24, 7, character.palette.primary);
      pixel(context, 42, 11, 4, 13, character.palette.primary);
      pixel(context, 46, 20, 4, 9, accent);
      break;
    case "barehead":
      pixel(context, 22, 7, 21, 5, character.palette.skin);
      break;
    default:
      pixel(context, 21, 7, 23, 5, character.palette.primary);
  }
}

function drawAccessory(context, character, accessory, accent, motion) {
  const metal = character.palette.metal;
  switch (accessory) {
    case "scarf":
    case "neck-wrap":
      pixel(context, 18, 21, 27, 5, accent);
      pixel(context, 13 + motion, 24, 8, 4, accent);
      pixel(context, 7 + motion, 27, 8, 3, accent);
      break;
    case "shoulder-guards":
      pixel(context, 11, 25, 12, 8, metal);
      pixel(context, 41, 25, 12, 8, metal);
      pixel(context, 13, 27, 8, 2, accent);
      pixel(context, 43, 27, 8, 2, accent);
      break;
    case "cape":
    case "long-coat":
      pixel(context, 13, 25, 9, 26, character.palette.shadow);
      pixel(context, 42, 25, 9, 26, character.palette.shadow);
      pixel(context, 14, 47, 8, 5, accent);
      pixel(context, 43, 47, 8, 5, accent);
      break;
    case "spellbook":
      pixel(context, 4, 34, 10, 13, "#7b4b55");
      pixel(context, 6, 36, 6, 9, "#e5c987");
      pixel(context, 8, 39, 2, 3, accent);
      break;
    case "floating-orb":
      pixel(context, 48, 25 + motion, 7, 7, accent);
      pixel(context, 50, 23 + motion, 3, 11, "#fff0a8");
      break;
    case "back-sheath":
      pixel(context, 13, 23, 5, 23, metal);
      pixel(context, 12, 22, 7, 3, accent);
      break;
    case "fur-mantle":
      pixel(context, 12, 23, 41, 10, "#c8aa82");
      pixel(context, 16, 21, 5, 5, "#e4d0a8");
      pixel(context, 44, 21, 5, 5, "#e4d0a8");
      break;
    case "trophy-belt":
      pixel(context, 16, 43, 34, 5, accent);
      pixel(context, 42, 45, 5, 7, metal);
      break;
    case "cartridge-belt":
      pixel(context, 16, 42, 34, 4, accent);
      for (let x = 20; x < 45; x += 6) pixel(context, x, 45, 3, 4, metal);
      break;
    case "spectral-trails":
      pixel(context, 8 + motion, 31, 5, 14, accent);
      pixel(context, 3 + motion, 37, 5, 12, "#d4c3ed");
      break;
    case "cloak-brooch":
      pixel(context, 29, 25, 7, 7, accent);
      pixel(context, 31, 27, 3, 3, "#fff0a8");
      break;
  }
}

function drawWeapon(context, character, accent, motion) {
  const metal = character.palette.metal;
  switch (character.weapon) {
    case "katana":
      pixel(context, 47, 8 + motion, 3, 35, metal);
      pixel(context, 44, 38 + motion, 9, 4, character.palette.shadow);
      pixel(context, 42, 39 + motion, 3, 10, accent);
      break;
    case "sword-shield":
      pixel(context, 49, 13, 3, 31, metal);
      pixel(context, 46, 39, 9, 4, character.palette.shadow);
      pixel(context, 5, 28, 12, 17, accent);
      pixel(context, 8, 31, 6, 11, metal);
      pixel(context, 10, 34, 2, 5, accent);
      break;
    case "staff":
      pixel(context, 48, 11 + motion, 4, 45, "#9a704a");
      pixel(context, 45, 7 + motion, 10, 8, accent);
      pixel(context, 48, 4 + motion, 4, 14, "#fff0a8");
      break;
    case "dual-daggers":
      pixel(context, 8, 30, 3, 17, metal);
      pixel(context, 6, 27, 7, 5, accent);
      pixel(context, 52, 29, 3, 17, metal);
      pixel(context, 50, 43, 7, 5, accent);
      break;
    case "war-hammer":
      pixel(context, 49, 23, 5, 32, "#805c3d");
      pixel(context, 42, 13, 18, 14, metal);
      pixel(context, 45, 16, 12, 8, accent);
      break;
    case "revolver":
      pixel(context, 48, 29, 14, 7, metal);
      pixel(context, 53, 35, 5, 11, "#79513a");
      pixel(context, 59, 31, 4, 3, accent);
      break;
    case "scythe":
      pixel(context, 49, 18, 4, 43, "#786247");
      pixel(context, 39, 7 + motion, 16, 5, metal);
      pixel(context, 35, 7 + motion, 8, 6, accent);
      pixel(context, 40, 12 + motion, 4, 6, metal);
      break;
  }
}

export function drawCharacterArt(context, character, configuration, time = 0) {
  if (!character) return;
  const cosmetics = configuration?.cosmetics || {};
  const accent = getAccent(character, cosmetics);
  const motion = Math.round(Math.sin(time * 1.7) * 1.5);
  if (character.spriteImage?.complete && character.spriteImage.naturalWidth > 0) {
    const frameWidth = character.frameWidth || 64;
    const frameHeight = character.frameHeight || 64;
    const clip = character.idle.frames || [0];
    const frameIndex = clip[Math.floor(time * (character.idle.fps || 4)) % clip.length];
    const columns = Math.max(1, Math.floor(character.spriteImage.naturalWidth / frameWidth));
    const sourceX = (frameIndex % columns) * frameWidth;
    const sourceY = Math.floor(frameIndex / columns) * frameHeight;
    context.drawImage(character.spriteImage, sourceX, sourceY, frameWidth, frameHeight,
      0, 0, 64, 64);
    drawHeadgear(context, character, cosmetics.headgear, accent);
    drawAccessory(context, character, cosmetics.accessory, accent, motion);
    return;
  }
  const breath = Math.sin(time * 2.2) * character.idle.breath;
  const blinkWindow = (time % character.idle.blinkEvery);
  const blinking = blinkWindow > character.idle.blinkEvery - 0.13;
  const dark = character.palette.shadow;
  const base = character.palette.primary;
  const metal = character.palette.metal;
  const shape = character.shape;

  pixel(context, 15, 57, 34, 4, "#171724");
  drawAccessory(context, character, cosmetics.accessory, accent, motion);
  drawWeapon(context, character, accent, motion);

  if (shape === "low") {
    pixel(context, 18, 43 + breath, 12, 12, base);
    pixel(context, 32, 39 + breath, 17, 10, base);
    pixel(context, 10, 51, 15, 5, dark);
    pixel(context, 38, 48, 14, 5, dark);
  } else if (shape === "heavy") {
    pixel(context, 12, 41 + breath, 17, 15, base);
    pixel(context, 35, 41 + breath, 17, 15, base);
    pixel(context, 10, 53, 19, 5, dark);
    pixel(context, 34, 53, 20, 5, dark);
  } else if (shape === "robed" || shape === "cloaked") {
    pixel(context, 23, 42 + breath, 18, 14, base);
    pixel(context, 17, 50, 30, 8, base);
    pixel(context, 13, 55, 38, 5, dark);
    pixel(context, 25, 50, 4, 7, accent);
  } else {
    pixel(context, 21, 42 + breath, 10, 14, base);
    pixel(context, 34, 42 + breath, 10, 14, base);
    pixel(context, 18, 53, 15, 5, dark);
    pixel(context, 32, 53, 16, 5, dark);
  }

  if (shape === "armored") {
    pixel(context, 15, 25 + breath, 34, 22, metal);
    pixel(context, 18, 28 + breath, 28, 16, base);
    pixel(context, 29, 27 + breath, 5, 20, accent);
    pixel(context, 15, 31, 7, 15, metal);
    pixel(context, 42, 31, 7, 15, metal);
  } else if (shape === "heavy") {
    pixel(context, 9, 25 + breath, 46, 23, base);
    pixel(context, 15, 28 + breath, 34, 15, dark);
    pixel(context, 12, 26, 13, 10, metal);
    pixel(context, 39, 26, 13, 10, metal);
    pixel(context, 28, 30, 9, 7, accent);
  } else if (shape === "robed") {
    pixel(context, 21, 23 + breath, 22, 21, base);
    pixel(context, 16, 38, 32, 14, base);
    pixel(context, 12, 48, 40, 11, dark);
    pixel(context, 25, 29, 14, 17, accent);
    pixel(context, 29, 30, 5, 14, metal);
  } else if (shape === "cloaked") {
    pixel(context, 19, 23 + breath, 27, 26, dark);
    pixel(context, 14, 39, 37, 18, base);
    pixel(context, 10, 50, 45, 10, dark);
    pixel(context, 28, 29, 9, 16, accent);
  } else if (shape === "low") {
    pixel(context, 22, 26 + breath, 25, 19, dark);
    pixel(context, 17, 35, 34, 14, base);
    pixel(context, 22, 27, 21, 5, accent);
  } else if (shape === "ranged") {
    pixel(context, 20, 24 + breath, 25, 25, base);
    pixel(context, 15, 32, 35, 22, dark);
    pixel(context, 21, 26, 6, 18, accent);
    pixel(context, 37, 29, 5, 16, accent);
  } else {
    pixel(context, 20, 24 + breath, 24, 24, base);
    pixel(context, 17, 28, 30, 7, dark);
    pixel(context, 28, 28, 8, 18, accent);
  }

  pixel(context, 18, 32, 7, 14, base);
  pixel(context, 41, 32, 7, 14, base);
  pixel(context, 16, 42, 9, 7, character.palette.skin);
  pixel(context, 42, 42, 9, 7, character.palette.skin);

  pixel(context, 22, 8 + breath, 20, 17, character.palette.skin);
  pixel(context, 19, 13 + breath, 26, 9, character.palette.skin);
  if (shape === "cloaked" || shape === "robed") {
    pixel(context, 20, 7 + breath, 24, 13, base);
    pixel(context, 20, 16 + breath, 24, 4, dark);
  }
  drawHeadgear(context, character, cosmetics.headgear, accent);
  pixel(context, 25, 18 + breath, 3, blinking ? 1 : 2, dark);
  pixel(context, 36, 18 + breath, 3, blinking ? 1 : 2, dark);
  pixel(context, 29, 22 + breath, 7, 2, dark);

  pixel(context, 20, 25, 7, 3, metal);
  pixel(context, 37, 25, 7, 3, metal);
  drawAccessory(context, character, cosmetics.accessory, accent, motion);
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
    context.fillRect(0, canvas.height - 24, canvas.width, 24);
    context.fillStyle = "#6b6a85";
    context.fillRect(0, canvas.height - 25, canvas.width, 2);

    const character = getCharacter();
    context.save();
    context.translate((canvas.width - 64 * 3) / 2, canvas.height - 24 - 64 * 3);
    context.scale(3, 3);
    drawCharacterArt(context, character, getConfiguration(), elapsed);
    context.restore();

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
