// The lock screen picture: night has come, and the mole sleeps in its burrow next to the vehicle.

import { drawGrass, drawHollow, drawStrata, HAT, INK, type Grass } from './draw';
import { mulberry32 } from './random';
import { drawSleepingMole, drawVehicle, type VehicleId } from './vehicles';

const NIGHT_SOIL = ['#6b4a35', '#5c3f2d', '#4d3426', '#3f2a1f'];
const NIGHT_GRASS: Grass = { strip: '#3f7d2c', back: '#336a24', front: '#4b8f36' };

export function drawBedtime(ctx: CanvasRenderingContext2D, width: number, height: number, vehicle: VehicleId, time: number): void {
  const groundY = Math.round(height * 0.34);
  const random = mulberry32(11);

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#16224a');
  sky.addColorStop(1, '#30477f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);

  const moonR = Math.min(width, height) * 0.06;
  const moonX = width * 0.84;
  const moonY = groundY * 0.72; // Below the "またあしたね" title on every screen.

  for (let i = 0; i < 40; i++) {
    const sx = random() * width;
    const sy = random() * groundY * 0.9;
    const r = 1 + random() * 1.8;
    // None behind the moon, whose dark side would hide them.
    if (Math.hypot(sx - moonX, sy - moonY) < moonR + r) continue;
    const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + i);
    ctx.fillStyle = `rgba(255, 244, 176, ${0.35 + 0.65 * twinkle})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crescent moon in a soft glow.
  const haloR = moonR * 2.6;
  const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, haloR);
  halo.addColorStop(0, 'rgba(255, 244, 176, 0.3)');
  halo.addColorStop(1, 'rgba(255, 244, 176, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - haloR, moonY - haloR, haloR * 2, haloR * 2);
  // A bite clipped out of the full moon, so the glow shows through it.
  const biteX = moonX + moonR * 0.45;
  const biteY = moonY - moonR * 0.25;
  const biteR = moonR * 0.9;
  const bite = new Path2D();
  bite.rect(0, 0, width, groundY);
  bite.moveTo(biteX + biteR, biteY);
  bite.arc(biteX, biteY, biteR, 0, Math.PI * 2);
  ctx.save();
  ctx.clip(bite, 'evenodd');
  ctx.fillStyle = '#fff4b0';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawStrata(ctx, width, groundY, height, NIGHT_SOIL, random);
  drawGrass(ctx, width, groundY, NIGHT_GRASS, random);

  // The burrow: a round room with a shaft up to the grass.
  const cx = width / 2;
  const cy = groundY + (height - groundY) * 0.5;
  const rx = Math.min(width * 0.44, 440);
  const ry = Math.min(rx * 0.46, (height - groundY) * 0.36);
  const room = new Path2D();
  room.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const opening = groundY - 4;
  const depth = ry * 0.16;
  const burrow = new Path2D(room);
  const shaftX = cx - rx * 0.62;
  // The shaft starts above the opening by the depth of the ceiling's shadow, so the cut below leaves none of it.
  burrow.rect(shaftX - ry * 0.32, opening - depth, ry * 0.64, cy - opening + depth);
  ctx.save();
  // Cut the shaft off at the grass so it opens as a hole rather than sticking up.
  ctx.beginPath();
  ctx.rect(0, opening, width, height);
  ctx.clip();
  drawHollow(ctx, burrow, '#c99c6c', 8, depth);
  ctx.restore();

  // A warm lantern glow so the room feels cosy, not dark.
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  glow.addColorStop(0, 'rgba(255, 228, 150, 0.55)');
  glow.addColorStop(1, 'rgba(255, 228, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fill(room);

  const floorY = cy + ry * 0.62;
  const size = Math.min(rx * 0.62, ry * 1.2);
  // Parked for the night: the driver is the mole asleep beside it.
  drawVehicle(ctx, vehicle, cx - rx * 0.36, floorY - size * 0.36, size, 1, 0, false);
  const moleX = cx + rx * 0.36;
  drawSleepingMole(ctx, moleX, floorY - size * 0.3, size);

  // Snores floating up from the mole (in hiragana, like every word in the app).
  ctx.save();
  ctx.font = `800 ${Math.round(size * 0.2)}px "Hiragino Maru Gothic ProN", "BIZ UDPGothic", sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 2; i++) {
    const phase = (time * 0.4 + i / 2) % 1;
    const zx = moleX - size * 0.2 + phase * size * 0.35;
    const zy = floorY - size * 0.55 - phase * size * 0.6;
    ctx.globalAlpha = Math.sin(phase * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.strokeText('ぐう', zx, zy);
    ctx.fillStyle = HAT;
    ctx.fillText('ぐう', zx, zy);
  }
  ctx.restore();
}
