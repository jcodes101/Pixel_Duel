const MOTION = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") ||
  { matches: false };

function resetParticle(particle, index, width, height, initial = false) {
  particle.x = (index * 67 + 31) % width;
  const falls = particle.type === "leaves" || particle.type === "petals";
  particle.y = initial ? (index * 43 + 17) % height
    : falls ? -particle.size : height - particle.size;
  particle.phase = (index * 2.399) % (Math.PI * 2);
}

export function createParticles(effect) {
  const count = Math.max(0, Math.min(24, effect?.count || 0));
  const particles = Array.from({ length: count }, (_, index) => {
    const particle = {
      x: 0,
      y: 0,
      size: effect.type === "embers" || effect.type === "sparks" ? 2 : 3,
      speed: effect.type === "cloud-dust" ? 5 + index % 4 : 9 + index % 9,
      drift: (index % 5 - 2) * 2,
      phase: 0,
      type: effect.type
    };
    resetParticle(particle, index, 480, 210, true);
    return particle;
  });
  return { particles, color: effect?.color || "#ffffff", type: effect?.type || "dust" };
}

export function updateAndDrawParticles(context, system, delta, time, reduced = MOTION.matches) {
  if (!system || reduced) return;
  const dt = Math.min(delta, 0.05);
  context.fillStyle = system.color;
  for (let index = 0; index < system.particles.length; index++) {
    const particle = system.particles[index];
    particle.phase += dt;
    if (system.type === "leaves" || system.type === "petals") {
      particle.y += particle.speed * dt;
      particle.x += (particle.drift + Math.sin(particle.phase * 1.7) * 3) * dt;
      if (particle.y > 210) resetParticle(particle, index, 480, 210);
    } else if (system.type === "cloud-dust") {
      particle.x += particle.speed * 0.35 * dt;
      particle.y += Math.sin(particle.phase) * 2 * dt;
      if (particle.x > 480) resetParticle(particle, index, 480, 210);
    } else {
      particle.y -= particle.speed * dt;
      if (particle.y < -particle.size) resetParticle(particle, index, 480, 210);
    }

    const alpha = system.type === "cloud-dust" ? 0.32 :
      system.type === "petals" ? 0.78 : 0.68;
    context.globalAlpha = alpha;
    if (system.type === "petals") {
      context.save();
      context.translate(Math.round(particle.x), Math.round(particle.y));
      context.rotate(Math.sin(particle.phase) * 0.7);
      context.fillRect(-2, -1, 4, 2);
      context.restore();
    } else if (system.type === "embers" || system.type === "sparks") {
      context.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 3);
      if (system.type === "sparks") context.fillRect(Math.round(particle.x), Math.round(particle.y) + 3, 1, 3);
    } else {
      context.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
    }
  }
  context.globalAlpha = 1;
}
