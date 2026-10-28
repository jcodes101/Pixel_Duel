import { createParticles, updateAndDrawParticles } from "./particles.js";
import { isUsableMapArtwork } from "./maps.mjs";

const WIDTH = 480;
const HEIGHT = 270;
const FLOOR = 211;
const FIGHTER_SAFE_RADIUS_X = 76;
const FIGHTER_SAFE_ABOVE_FEET = 106;
const FIGHTER_SAFE_BELOW_FEET = 2;
const FALLBACK_MAP = {
  environment: "grove",
  palette: { sky: "#263d43", far: "#344d48", mid: "#46604d", ground: "#34453a", accent: "#a7bd76", light: "#e6d79a" },
  effects: { type: "leaves", count: 10, color: "#c4d883" }
};

function rect(context, x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function polygon(context, points, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
  context.closePath();
  context.fill();
}

function drawGrove(context, palette, time) {
  for (let i = 0; i < 7; i++) {
    const x = i * 78 - 18;
    rect(context, x, 20, 20 + i % 3 * 5, 177, palette.far);
    rect(context, x + 5, 43, 9, 120, "#263b3b");
    rect(context, x - 15, 11 + i % 2 * 13, 61, 25, palette.mid);
    rect(context, x - 24, 25 + i % 2 * 13, 77, 21, palette.far);
  }
  rect(context, 0, 0, WIDTH, 11, palette.sky);
  for (let i = 0; i < 5; i++) {
    const x = 26 + i * 108;
    rect(context, x + Math.sin(time + i) * 2, 7, 5, 93, "rgba(231, 219, 152, 0.14)");
  }
  rect(context, 65, 120, 71, 65, "#5c6e56");
  rect(context, 77, 128, 45, 54, "#314b47");
  rect(context, 82, 145, 8, 37, "#1c3032");
  rect(context, 60, 117, 81, 8, "#829268");
  rect(context, 331, 132, 89, 49, "#536652");
  rect(context, 345, 141, 59, 40, "#293f40");
  rect(context, 324, 127, 104, 8, "#84936b");
  rect(context, 0, 183, WIDTH, 28, "rgba(192, 212, 169, 0.12)");
}

function drawCitadel(context, palette, time) {
  rect(context, 0, 54, WIDTH, 116, palette.far);
  for (let i = 0; i < 6; i++) {
    const x = i * 82 - 9;
    rect(context, x, 39 + i % 2 * 9, 69, 132, palette.mid);
    rect(context, x + 7, 27 + i % 2 * 9, 55, 17, palette.far);
    for (let j = 0; j < 3; j++) rect(context, x + j * 23, 21 + i % 2 * 9, 11, 12, palette.mid);
    rect(context, x + 25, 72, 15, 34, "#241e30");
    polygon(context, [x + 25, 73, x + 32, 60, x + 40, 73], "#241e30");
    rect(context, x + 29, 82, 4, 19, "rgba(218, 91, 83, 0.44)");
  }
  for (const x of [70, 394]) {
    rect(context, x, 99, 14, 105, "#70605a");
    rect(context, x - 4, 96, 22, 8, "#a17b6a");
    rect(context, x + 4, 126, 6, 43, palette.accent);
    rect(context, x + 2, 117, 10, 8, palette.light);
    context.globalAlpha = 0.3 + Math.sin(time * 4 + x) * 0.08;
    rect(context, x - 7, 112, 23, 19, palette.light);
    context.globalAlpha = 1;
  }
}

function drawShrine(context, palette, time) {
  context.fillStyle = palette.light;
  context.beginPath();
  context.arc(385, 47, 28, 0, Math.PI * 2);
  context.fill();
  polygon(context, [0, 139, 77, 67, 144, 139, 236, 73, 313, 143, 398, 85, 480, 143, 480, 197, 0, 197], palette.far);
  rect(context, 0, 149, WIDTH, 50, palette.mid);
  for (let i = 0; i < 2; i++) {
    const cloudX = (i * 292 + time * 8) % 560 - 70;
    rect(context, cloudX, 66 + i * 18, 48, 5, "rgba(172, 190, 218, 0.32)");
    rect(context, cloudX + 9, 61 + i * 18, 31, 5, "rgba(172, 190, 218, 0.28)");
  }
  for (const x of [42, 434]) {
    rect(context, x, 67, 12, 118, "#29364f");
    rect(context, x - 6, 65, 24, 8, palette.accent);
    rect(context, x - 13, 72, 38, 6, "#d18baa");
    for (let i = 0; i < 6; i++) {
      const bx = x + Math.sin(time + i) * 2;
      rect(context, bx - 15 + i * 5, 42 + (i % 3) * 8, 16, 8, "#573f68");
    }
  }
  rect(context, 183, 116, 113, 65, "#7b6074");
  polygon(context, [166, 120, 239, 79, 312, 120, 299, 125, 239, 94, 179, 125], "#c5879f");
  rect(context, 195, 126, 9, 55, "#39364f");
  rect(context, 275, 126, 9, 55, "#39364f");
  rect(context, 219, 132, 39, 49, "#3b354b");
  rect(context, 225, 138, 27, 38, "#19283e");
  for (const x of [111, 350]) {
    context.globalAlpha = 0.72 + Math.sin(time * 2.2 + x) * 0.12;
    rect(context, x, 170, 15, 26, "#857c8b");
    rect(context, x - 5, 166, 25, 6, "#aaa2a5");
    rect(context, x + 3, 158, 9, 9, palette.light);
    context.globalAlpha = 1;
  }
}

function drawForge(context, palette, time) {
  polygon(context, [0, 0, 480, 0, 480, 154, 421, 177, 367, 161, 303, 182, 226, 151, 149, 174, 76, 151, 0, 175], palette.far);
  for (const x of [69, 203, 337]) {
    rect(context, x, 75, 74, 99, "#51403d");
    rect(context, x + 8, 65, 58, 18, "#765044");
    polygon(context, [x + 8, 105, x + 37, 86, x + 66, 105, x + 61, 166, x + 13, 166], "#241f25");
    context.globalAlpha = 0.52 + Math.sin(time * 3 + x) * 0.12;
    rect(context, x + 19, 122, 36, 38, palette.accent);
    rect(context, x + 27, 115, 19, 45, palette.light);
    context.globalAlpha = 1;
  }
  for (let x = 30; x < WIDTH; x += 74) {
    rect(context, x, 0, 2, 53, "#8c7965");
    rect(context, x - 5, 48, 12, 4, "#a88a67");
  }
  rect(context, 0, 187, WIDTH, 18, "#1e1b21");
  rect(context, 0, 198, WIDTH, 5, palette.accent);
  for (let x = 0; x < WIDTH; x += 24) rect(context, x, 196 + Math.sin(time * 2 + x) * 1.5, 12, 3, palette.light);
}

function drawSky(context, palette, time) {
  for (let i = 0; i < 8; i++) {
    const x = (i * 81 + Math.sin(time * 0.15 + i) * 12 + WIDTH) % WIDTH;
    const y = 44 + (i % 4) * 27;
    rect(context, x, y, 56, 8, "#c8e0e6");
    rect(context, x + 9, y - 6, 31, 7, "#d7e9e9");
    rect(context, x + 5, y + 8, 42, 5, "#a8cad7");
  }
  polygon(context, [0, 148, 88, 98, 167, 146, 247, 86, 344, 149, 421, 102, 480, 141, 480, 189, 0, 189], palette.far);
  for (const x of [35, 177, 350]) {
    const bob = Math.sin(time * 0.7 + x) * 2;
    polygon(context, [x, 157 + bob, x + 69, 157 + bob, x + 57, 178 + bob, x + 15, 186 + bob], "#596a7d");
    rect(context, x + 7, 149 + bob, 55, 8, "#a9a58f");
    if (x !== 177) {
      rect(context, x + 24, 92 + bob, 7, 57, "#7e8d92");
      rect(context, x + 17, 87 + bob, 21, 6, "#d0c59d");
      rect(context, x + 47, 117 + bob, 8, 39, "#a6d9db");
      rect(context, x + 45, 155 + bob, 12, 25, "rgba(202, 238, 239, 0.5)");
      rect(context, x + 48 + Math.sin(time * 5 + x) * 2, 165 + bob, 5, 12, "rgba(224, 250, 244, 0.55)");
    }
  }
}

function drawFloor(context, palette) {
  rect(context, 0, FLOOR, WIDTH, HEIGHT - FLOOR, "#191c24");
  rect(context, 0, FLOOR, WIDTH, 3, palette.accent);
  rect(context, 0, FLOOR + 3, WIDTH, 6, palette.ground);
  for (let i = 0; i < 20; i++) {
    rect(context, i * 27, FLOOR + 19 + (i % 3) * 8, 18, 3,
      i % 2 ? "#242832" : "#30313a");
  }
}

function drawAtmosphere(context, map, time) {
  const env = map.environment;
  if (env === "grove") {
    context.globalAlpha = 0.14;
    for (let i = 0; i < 3; i++) rect(context, 0, 178 + i * 8 + Math.sin(time + i) * 2, WIDTH, 9, "#d1dfae");
  } else if (env === "citadel") {
    context.globalAlpha = 0.08 + Math.sin(time * 0.8) * 0.02;
    rect(context, 0, 0, WIDTH, 210, map.palette.accent);
  } else if (env === "shrine") {
    context.globalAlpha = 0.14;
    for (const x of [111, 350]) rect(context, x - 10, 151, 36, 38, map.palette.light);
  } else if (env === "forge") {
    context.globalAlpha = 0.06 + Math.sin(time * 2) * 0.02;
    rect(context, 0, 60, WIDTH, 145, map.palette.accent);
  } else if (env === "sky") {
    context.globalAlpha = 0.16;
    rect(context, 0, 178, WIDTH, 28, "#e5f4ed");
  }
  context.globalAlpha = 1;
}

function getSafeMap(map) {
  return map?.fallback === "procedural-canvas" ? map : FALLBACK_MAP;
}

function drawProceduralMap(context, map, time, delta, system, reducedMotion) {
  const safeMap = getSafeMap(map);
  rect(context, 0, 0, WIDTH, HEIGHT, safeMap.palette.sky);
  if (reducedMotion) time = 0;
  switch (safeMap.environment) {
    case "citadel": drawCitadel(context, safeMap.palette, time); break;
    case "shrine": drawShrine(context, safeMap.palette, time); break;
    case "forge": drawForge(context, safeMap.palette, time); break;
    case "sky": drawSky(context, safeMap.palette, time); break;
    default: drawGrove(context, safeMap.palette, time);
  }
  drawAtmosphere(context, safeMap, time);
  updateAndDrawParticles(context, system, delta, time, reducedMotion);
  drawFloor(context, safeMap.palette);
}

function drawParallaxLayer(context, layer, cameraX = 0) {
  const image = layer?.image;
  if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
  const scale = HEIGHT / image.naturalHeight;
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const offset = ((cameraX * layer.parallax) % drawWidth + drawWidth) % drawWidth;
  for (let x = -offset; x < WIDTH; x += drawWidth) {
    context.drawImage(image, Math.round(x), 0, drawWidth, HEIGHT);
  }
}

function drawArtworkLayers(context, map, firstLayer, lastLayer, cameraX = 0) {
  for (let index = firstLayer; index <= lastLayer; index++) {
    drawParallaxLayer(context, map.artwork.layers[index], cameraX);
  }
}

export function getFighterSafeAreas(floorY, centers = [132, 348]) {
  return centers.map(centerX => ({
    x: centerX - FIGHTER_SAFE_RADIUS_X,
    y: floorY - FIGHTER_SAFE_ABOVE_FEET,
    width: FIGHTER_SAFE_RADIUS_X * 2,
    height: FIGHTER_SAFE_ABOVE_FEET + FIGHTER_SAFE_BELOW_FEET
  }));
}

export function isPointInFighterSafeArea(x, y, safeAreas) {
  return safeAreas.some(area => x >= area.x && x < area.x + area.width &&
    y >= area.y && y < area.y + area.height);
}

export function drawMap(context, map, time = 0, delta = 0, system = null, reducedMotion = false) {
  const safeMap = map?.fallback === "procedural-canvas" ? map : FALLBACK_MAP;
  if (isUsableMapArtwork(safeMap)) {
    drawArtworkLayers(context, safeMap, 0, 4);
    updateAndDrawParticles(context, system, delta, time, reducedMotion);
  } else {
    drawProceduralMap(context, safeMap, time, delta, system, reducedMotion);
  }
}

export function createMapRenderer(context) {
  let activeMapId = null;
  let particleSystem = null;
  function activateMap(map) {
    if (map?.id === activeMapId) return;
    activeMapId = map?.id || "fallback";
    particleSystem = createParticles(map?.effects || {
      type: "leaves", count: 10, color: "#c4d883"
    });
  }

  return {
    drawBackground(map, time, delta, reducedMotion, cameraX = 0) {
      activateMap(map);
      if (!isUsableMapArtwork(map)) {
        drawProceduralMap(context, map, time, delta, particleSystem, reducedMotion);
        return FLOOR;
      }
      // The full fifth layer belongs behind the fighters. It may contain large
      // foreground silhouettes and must not be composited over the sprite lane.
      drawArtworkLayers(context, map, 0, 4, reducedMotion ? 0 : cameraX);
      updateAndDrawParticles(context, particleSystem, delta, time, reducedMotion);
      return map.artwork.floorY;
    },

    drawForeground(map, cameraX = 0, fighterSafeAreas = []) {
      if (isUsableMapArtwork(map)) {
        if (fighterSafeAreas.length) {
          // The fifth artwork layer is still redrawn in front for depth, with
          // even-odd holes around both complete fighter/action bounds.
          context.save();
          context.beginPath();
          context.rect(0, 0, WIDTH, HEIGHT);
          fighterSafeAreas.forEach(area =>
            context.rect(area.x, area.y, area.width, area.height));
          context.clip("evenodd");
          drawParallaxLayer(context, map.artwork.layers[4], cameraX);
          context.restore();
        } else {
          drawParallaxLayer(context, map.artwork.layers[4], cameraX);
        }
      }
    },

    draw(map, time, delta, reducedMotion) {
      this.drawBackground(map, time, delta, reducedMotion);
      this.drawForeground(map);
    }
  };
}
