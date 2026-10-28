import {
  drawCharacterArt,
  drawMoveEffect,
  getAnimationDuration
} from "./characterPreview.mjs";
import { resolveAnimation } from "./assetLoader.mjs";
import { getMapById } from "./maps.mjs";
import { createMapRenderer, getFighterSafeAreas } from "./mapRenderer.js";

const COLORS = { gold: "#f0ca7a" };

const PLAYER_X = [132, 348];
const HIT_DELAY_MS = 420;

function mapMoveToAnimation(move) {
  switch (move) {
    case "Attack": return "attack";
    case "Defend": return "defend";
    case "Heal": return "heal";
    case "Special": return "special";
    default: return "idle";
  }
}

function getCharacter(manifest, player) {
  return manifest.classes.find(character => character.id === player.characterId) ||
    manifest.classes[0];
}

function getVariant(character, player) {
  return character.variants.find(variant => variant.id === player.variantId) ||
    character.variants[0];
}

function createPlayback() {
  let currentKey = "";
  let actors = [];

  function observe(state, now) {
    let nextKey = `idle-${state.round}`;
    if (state.phase === "RESOLVING" && state.result) nextKey = `resolving-${state.round}`;
    else if (state.phase === "GAME_OVER") nextKey = `game-over-${state.round}`;
    if (nextKey === currentKey) return;
    currentKey = nextKey;

    if (state.phase === "RESOLVING" && state.result) {
      actors = state.players.map((player, index) => ({
        action: mapMoveToAnimation(state.result.moves[index]),
        move: state.result.moves[index],
        startedAt: now,
        impactAt: now + HIT_DELAY_MS,
        tookDamage: state.result.damage[index] > 0,
        healed: state.result.heal[index] > 0
      }));
    } else if (state.phase === "GAME_OVER") {
      actors = state.players.map((player, index) => ({
        action: state.result?.winner === -1 ? "idle"
          : state.result?.winner === index ? "victory" : "defeat",
        startedAt: now,
        tookDamage: false,
        healed: false
      }));
    } else {
      actors = state.players.map(() => ({
        action: "idle",
        startedAt: now,
        tookDamage: false,
        healed: false
      }));
    }
  }

  function forPlayer(index, character, player, phase, now) {
    const actor = actors[index] || { action: "idle", startedAt: now };
    if (phase === "RESOLVING" && actor.tookDamage && now >= actor.impactAt) {
      const variant = getVariant(character, player);
      const hurtDuration = getAnimationDuration(variant, "hurt");
      if (now < actor.impactAt + Math.max(220, hurtDuration)) {
        return {
          ...actor,
          action: "hurt",
          elapsedMs: now - actor.impactAt,
          hit: true
        };
      }
    }

    const elapsedMs = now - actor.startedAt;
    if (phase === "RESOLVING" && actor.action !== "defend") {
      const variant = getVariant(character, player);
      const duration = getAnimationDuration(variant, actor.action);
      if (duration > 0 && elapsedMs >= duration) {
        return { ...actor, action: "idle", elapsedMs: now, hit: false };
      }
    }
    return {
      ...actor,
      elapsedMs: actor.action === "idle" ? now : elapsedMs,
      hit: false
    };
  }

  return { observe, forPlayer };
}

function drawCombatFeedback(context, state, index, time) {
  if (state.phase !== "RESOLVING" || !state.result) return;
  const damage = state.result.damage[index];
  const heal = state.result.heal[index];
  const numberY = 99 + Math.sin(time * 8) * 2;
  context.save();
  context.font = '9px "Pixelify Sans", monospace';
  context.textAlign = "center";
  context.lineWidth = 2;
  context.strokeStyle = "#171522";
  if (damage > 0) {
    context.fillStyle = COLORS.gold;
    context.strokeText(`-${damage}`, PLAYER_X[index], numberY);
    context.fillText(`-${damage}`, PLAYER_X[index], numberY);
  }
  if (heal > 0) {
    context.fillStyle = "#9de391";
    context.strokeText(`+${heal}`, PLAYER_X[index], numberY - 12);
    context.fillText(`+${heal}`, PLAYER_X[index], numberY - 12);
  }
  context.restore();
}

function actorLunge(action, elapsedMs, facing, reducedMotion) {
  if (reducedMotion || (action !== "attack" && action !== "special") || elapsedMs >= 250) return 0;
  return Math.round(facing * 8 * Math.sin(Math.max(0, elapsedMs) / 250 * Math.PI));
}

export function createBattleCanvas(canvas, getState) {
  const context = canvas.getContext("2d");
  const mapRenderer = createMapRenderer(context);
  const playback = createPlayback();
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
    playback.observe(state, timestamp);
    const map = getMapById(state.maps, state.mapId);
    const floorY = mapRenderer.drawBackground(map, elapsed, delta, reducedMotion.matches);

    const actors = state.players.map((player, index) => {
      const character = getCharacter(state.manifest, player);
      const actor = playback.forPlayer(index, character, player, state.phase, timestamp);
      const facing = index === 0 ? 1 : -1;
      const lunge = actorLunge(actor.action, actor.elapsedMs, facing, reducedMotion.matches);
      const shake = actor.action === "hurt" && !reducedMotion.matches
        ? Math.round(Math.sin(actor.elapsedMs / 18) * 2) : 0;
      const centerX = PLAYER_X[index] + lunge + shake;
      drawCharacterArt(context, character, player, elapsed, {
        action: actor.action,
        elapsedMs: actor.elapsedMs,
        centerX,
        baseline: floorY,
        shouldFaceRight: index === 0
      });
      const variant = getVariant(character, player);
      const defendFallback = actor.action === "defend" &&
        resolveAnimation(variant, "defend", true)?.animationId === "idle";
      return { character, player, actor, facing, centerX, defendFallback, index };
    });

    actors.forEach(({ character, player, actor, facing, centerX, defendFallback }) => {
      drawMoveEffect(context, {
        action: actor.action,
        characterId: character.id,
        centerX,
        baseline: floorY,
        facing,
        elapsedMs: actor.elapsedMs,
        reducedMotion: reducedMotion.matches,
        shieldFallback: defendFallback,
        hit: actor.hit
      });
    });

    mapRenderer.drawForeground(map, 0, getFighterSafeAreas(floorY));
    state.players.forEach((player, index) => drawCombatFeedback(context, state, index, elapsed));
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
