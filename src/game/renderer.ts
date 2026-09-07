import type { Balloon, Particle } from "./types";
import { lightenHex } from "../utils/color";

function balloonGradient(ctx: CanvasRenderingContext2D, balloon: Balloon): CanvasGradient {
  const gradient = ctx.createRadialGradient(
    balloon.x - balloon.radius * 0.35,
    balloon.y - balloon.radius * 0.4,
    balloon.radius * 0.1,
    balloon.x,
    balloon.y,
    balloon.radius * 1.15,
  );

  if (balloon.kind === "bomb") {
    gradient.addColorStop(0, "#5b4a73");
    gradient.addColorStop(1, balloon.color);
  } else if (balloon.kind === "golden") {
    gradient.addColorStop(0, "#FFF6D6");
    gradient.addColorStop(0.55, balloon.color);
    gradient.addColorStop(1, "#E8A200");
  } else {
    gradient.addColorStop(0, lightenHex(balloon.color, 0.55));
    gradient.addColorStop(1, balloon.color);
  }
  return gradient;
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.28, -size * 0.28);
  ctx.lineTo(size, 0);
  ctx.lineTo(size * 0.28, size * 0.28);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.28, size * 0.28);
  ctx.lineTo(-size, 0);
  ctx.lineTo(-size * 0.28, -size * 0.28);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fill();
  ctx.restore();
}

export function drawBalloon(ctx: CanvasRenderingContext2D, balloon: Balloon, nowMs: number): void {
  const sway = Math.sin(nowMs / 500 + balloon.wobblePhase) * (balloon.radius * 0.08);

  ctx.save();

  // String
  ctx.beginPath();
  ctx.moveTo(balloon.x, balloon.y + balloon.radius * 0.95);
  ctx.quadraticCurveTo(
    balloon.x + sway,
    balloon.y + balloon.radius * 1.7,
    balloon.x,
    balloon.y + balloon.radius * 2.4,
  );
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = Math.max(1.5, balloon.radius * 0.03);
  ctx.stroke();

  // Knot
  ctx.beginPath();
  ctx.moveTo(balloon.x - balloon.radius * 0.12, balloon.y + balloon.radius * 0.92);
  ctx.lineTo(balloon.x + balloon.radius * 0.12, balloon.y + balloon.radius * 0.92);
  ctx.lineTo(balloon.x, balloon.y + balloon.radius * 1.08);
  ctx.closePath();
  ctx.fillStyle = balloon.color;
  ctx.fill();

  if (balloon.kind === "golden" || balloon.kind === "bomb") {
    ctx.shadowColor = balloon.kind === "golden" ? "rgba(255, 210, 63, 0.9)" : "rgba(255, 70, 70, 0.75)";
    ctx.shadowBlur = balloon.radius * 0.9;
  }

  // Body
  ctx.beginPath();
  ctx.ellipse(balloon.x, balloon.y, balloon.radius * 0.92, balloon.radius, 0, 0, Math.PI * 2);
  ctx.fillStyle = balloonGradient(ctx, balloon);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Glossy highlight
  ctx.beginPath();
  ctx.ellipse(
    balloon.x - balloon.radius * 0.32,
    balloon.y - balloon.radius * 0.38,
    balloon.radius * 0.24,
    balloon.radius * 0.34,
    -0.4,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fill();

  if (balloon.kind === "bomb") {
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y - balloon.radius);
    ctx.quadraticCurveTo(
      balloon.x + balloon.radius * 0.3,
      balloon.y - balloon.radius * 1.3,
      balloon.x + balloon.radius * 0.1,
      balloon.y - balloon.radius * 1.5,
    );
    ctx.strokeStyle = "#C9A55C";
    ctx.lineWidth = Math.max(1.5, balloon.radius * 0.05);
    ctx.stroke();

    const flicker = 0.6 + Math.sin(nowMs / 60) * 0.4;
    ctx.beginPath();
    ctx.arc(balloon.x + balloon.radius * 0.1, balloon.y - balloon.radius * 1.5, balloon.radius * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 140, 60, ${flicker})`;
    ctx.fill();
  }

  if (balloon.kind === "golden") {
    const spin = (nowMs / 400) % (Math.PI * 2);
    drawSparkle(ctx, balloon.x + balloon.radius * 0.4, balloon.y + balloon.radius * 0.1, balloon.radius * 0.22, spin);
  }

  ctx.restore();
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle): void {
  const alpha = clamp01(particle.life / particle.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  ctx.fillStyle = particle.color;
  ctx.fill();
  ctx.restore();
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  balloons: Balloon[],
  particles: Particle[],
  nowMs: number,
): void {
  ctx.clearRect(0, 0, width, height);
  for (const balloon of balloons) drawBalloon(ctx, balloon, nowMs);
  for (const particle of particles) drawParticle(ctx, particle);
}
