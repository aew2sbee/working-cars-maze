// The lock screen picture: night has come, and the mole sleeps in its burrow next to the vehicle.

import { HAT, INK } from './draw';
import { mulberry32 } from './random';
import { drawSleepingMole, drawVehicle, type VehicleId } from './vehicles';

const NIGHT_SOIL = ['#6b4a35', '#5c3f2d', '#4d3426', '#3f2a1f'];

export function drawBedtime(ctx: CanvasRenderingContext2D, width: number, height: number, vehicle: VehicleId, time: number): void {
  const groundY = Math.round(height * 0.34);
  const random = mulberry32(11);

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#16224a');
  sky.addColorStop(1, '#30477f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);

  for (let i = 0; i < 40; i++) {
    const sx = random() * width;
    const sy = random() * groundY * 0.9;
    const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + i);
    ctx.fillStyle = `rgba(255, 244, 176, ${0.35 + 0.65 * twinkle})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crescent moon.
  const moonR = Math.min(width, height) * 0.06;
  const moonX = width * 0.84;
  const moonY = groundY * 0.72; // Below the "またあしたね" title on every screen.
  ctx.fillStyle = '#fff4b0';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f2f5e';
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.45, moonY - moonR * 0.25, moonR * 0.9, 0, Math.PI * 2);
  ctx.fill();

  const band = (height - groundY) / NIGHT_SOIL.length;
  NIGHT_SOIL.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, groundY + i * band, width, band + 1);
  });
  ctx.fillStyle = '#3f7d2c';
  ctx.fillRect(0, groundY - 10, width, 14);

  // The burrow: a round room with a shaft up to the grass.
  const cx = width / 2;
  const cy = groundY + (height - groundY) * 0.5;
  const rx = Math.min(width * 0.44, 440);
  const ry = Math.min(rx * 0.46, (height - groundY) * 0.36);
  const room = new Path2D();
  room.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const shaftX = cx - rx * 0.62;
  const shaft = new Path2D();
  shaft.rect(shaftX - ry * 0.32, groundY - 8, ry * 0.64, cy - groundY);
  ctx.save();
  // Cut the shaft off at the grass so it opens as a hole rather than sticking up.
  ctx.beginPath();
  ctx.rect(0, groundY - 4, width, height);
  ctx.clip();
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#3d2314';
  ctx.stroke(room);
  ctx.stroke(shaft);
  ctx.fillStyle = '#c99c6c';
  ctx.fill(room);
  ctx.fill(shaft);
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
