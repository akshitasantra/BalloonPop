import type { Particle } from "./types";
import { PARTICLE_GRAVITY, PARTICLES_PER_POP } from "./constants";
import { randRange } from "../utils/geometry";

export function spawnPopParticles(
  x: number,
  y: number,
  color: string,
  count: number = PARTICLES_PER_POP,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + randRange(-0.25, 0.25);
    const speed = randRange(80, 260);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      radius: randRange(2, 5),
      color,
      life: randRange(0.4, 0.75),
      maxLife: 0.75,
      gravity: PARTICLE_GRAVITY,
    });
  }
  return particles;
}

/** Advances particles by dt seconds and drops any that have expired. */
export function updateParticles(particles: Particle[], dtSeconds: number): Particle[] {
  const alive: Particle[] = [];
  for (const particle of particles) {
    particle.life -= dtSeconds;
    if (particle.life <= 0) continue;
    particle.vy += particle.gravity * dtSeconds;
    particle.x += particle.vx * dtSeconds;
    particle.y += particle.vy * dtSeconds;
    alive.push(particle);
  }
  return alive;
}
