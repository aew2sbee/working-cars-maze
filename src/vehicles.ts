// The vehicles a child can pick, each driven by the same mole in a hard hat.
// Drawn facing right in a 100 x 100 box centred on (0, 0); flipped to face left.

import { HAT, INK } from './draw';

export type VehicleId = 'crane' | 'excavator' | 'bulldozer' | 'dump';

export const VEHICLES: { id: VehicleId; name: string }[] = [
  { id: 'crane', name: 'くれーんしゃ' },
  { id: 'excavator', name: 'しょべるかー' },
  { id: 'bulldozer', name: 'ぶるどーざー' },
  { id: 'dump', name: 'だんぷとらっく' },
];

const BODY = '#f6b818';
const STEEL = '#6a6a6a';
const RUBBER = '#3b3b3b';
const FUR = '#6d4c3d';
const PINK = '#f29bb0';

export function drawVehicle(
  ctx: CanvasRenderingContext2D,
  id: VehicleId,
  x: number,
  y: number,
  size: number,
  facing: 1 | -1,
  bob: number,
): void {
  const u = size / 100;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(facing * u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;

  switch (id) {
    case 'crane':
      drawCrane(ctx);
      break;
    case 'excavator':
      drawExcavator(ctx);
      break;
    case 'bulldozer':
      drawBulldozer(ctx);
      break;
    case 'dump':
      drawDumpTruck(ctx);
      break;
  }

  ctx.restore();
}

function drawExcavator(ctx: CanvasRenderingContext2D): void {
  drawCrawler(ctx);
  drawArm(ctx, [
    [14, -2],
    [32, -30],
    [46, -4],
  ]);
  drawBucket(ctx);
  drawBody(ctx, -38, -8, 58, 24);
  drawMole(ctx, -14, -18);
  drawPaws(ctx, [-6, 4], -7);
}

function drawCrane(ctx: CanvasRenderingContext2D): void {
  drawCrawler(ctx);
  // Lattice boom: two rails with cross braces.
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.lineTo(38, -48);
  ctx.moveTo(18, 0);
  ctx.lineTo(48, -44);
  for (let t = 0.12; t < 0.95; t += 0.2) {
    ctx.moveTo(4 + 34 * t, -4 - 44 * t);
    ctx.lineTo(18 + 30 * (t + 0.1), 0 - 44 * (t + 0.1));
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = BODY;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Cable and hook.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(45, -46);
  ctx.lineTo(45, -14);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(45, -6, 7, -Math.PI / 2, Math.PI * 0.9);
  ctx.stroke();
  ctx.lineWidth = 3;
  drawBody(ctx, -38, -8, 58, 24);
  drawMole(ctx, -14, -18);
  drawPaws(ctx, [-6, 4], -7);
}

function drawBulldozer(ctx: CanvasRenderingContext2D): void {
  drawCrawler(ctx);
  // Push arm and the big blade in front.
  drawArm(ctx, [
    [10, 6],
    [40, 14],
  ]);
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.moveTo(38, -14);
  ctx.lineTo(54, -14);
  ctx.quadraticCurveTo(46, 12, 56, 36);
  ctx.lineTo(38, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Steel cutting edge.
  ctx.fillStyle = STEEL;
  ctx.beginPath();
  ctx.moveTo(38, 30);
  ctx.lineTo(54, 30);
  ctx.lineTo(56, 36);
  ctx.lineTo(38, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawBody(ctx, -38, -8, 54, 24);
  // Exhaust pipe.
  ctx.fillStyle = RUBBER;
  ctx.beginPath();
  ctx.roundRect(4, -20, 6, 13, 2);
  ctx.fill();
  drawMole(ctx, -16, -18);
  drawPaws(ctx, [-8, 2], -7);
}

function drawDumpTruck(ctx: CanvasRenderingContext2D): void {
  // Chassis.
  ctx.fillStyle = RUBBER;
  ctx.beginPath();
  ctx.roundRect(-44, 10, 86, 10, 4);
  ctx.fill();
  // Tipping bed at the back.
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.moveTo(-48, -18);
  ctx.lineTo(4, -18);
  ctx.lineTo(4, 10);
  ctx.lineTo(-40, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // A heap of soil in the bed.
  ctx.fillStyle = '#8a5a36';
  ctx.beginPath();
  ctx.moveTo(-44, -18);
  ctx.quadraticCurveTo(-22, -36, 0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Open-top cab, so the mole is as easy to see as on the other vehicles.
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.moveTo(8, 10);
  ctx.lineTo(8, -10);
  ctx.lineTo(40, -10);
  ctx.lineTo(46, 0);
  ctx.lineTo(46, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawMole(ctx, 22, -20);
  drawPaws(ctx, [28, 38], -9);
  // Windshield frame in front of the mole.
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(42, -10);
  ctx.lineTo(42, -28);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (const wheel of [-28, -10, 26]) {
    ctx.fillStyle = RUBBER;
    ctx.beginPath();
    ctx.arc(wheel, 24, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9a9a9a';
    ctx.beginPath();
    ctx.arc(wheel, 24, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrawler(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = RUBBER;
  ctx.beginPath();
  ctx.roundRect(-42, 12, 80, 24, 12);
  ctx.fill();
  for (const wheel of [-29, -4, 21]) {
    ctx.fillStyle = '#9a9a9a';
    ctx.beginPath();
    ctx.arc(wheel, 24, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = RUBBER;
    ctx.beginPath();
    ctx.arc(wheel, 24, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Machine body with a hazard stripe along the bottom. */
function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 6);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = INK;
  const bottom = y + height;
  for (let sx = x - 6; sx < x + width; sx += 10) {
    ctx.beginPath();
    ctx.moveTo(sx, bottom);
    ctx.lineTo(sx + 5, bottom);
    ctx.lineTo(sx + 10, bottom - 7);
    ctx.lineTo(sx + 5, bottom - 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 6);
  ctx.stroke();
}

/** A thick two-tone arm through the given joints. */
function drawArm(ctx: CanvasRenderingContext2D, joints: [number, number][]): void {
  ctx.beginPath();
  joints.forEach(([jx, jy], i) => (i === 0 ? ctx.moveTo(jx, jy) : ctx.lineTo(jx, jy)));
  ctx.lineWidth = 15;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.strokeStyle = BODY;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
}

function drawBucket(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = STEEL;
  ctx.beginPath();
  ctx.moveTo(38, -8);
  ctx.lineTo(56, -8);
  ctx.lineTo(54, 8);
  ctx.lineTo(48, 4);
  ctx.lineTo(44, 10);
  ctx.lineTo(40, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** The mole's head in a hard hat, centred on (hx, hy). */
function drawMole(ctx: CanvasRenderingContext2D, hx: number, hy: number, scale = 1): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;

  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.arc(18, 3, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A happy, squinting eye.
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.quadraticCurveTo(8, -6, 12, -2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(242, 155, 176, 0.6)';
  ctx.beginPath();
  ctx.arc(5, 7, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = HAT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -8, 15, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-19, -11, 38, 6, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Front paws resting on the controls. */
function drawPaws(ctx: CanvasRenderingContext2D, xs: number[], y: number): void {
  ctx.fillStyle = PINK;
  ctx.lineWidth = 2;
  for (const px of xs) {
    ctx.beginPath();
    ctx.ellipse(px, y, 4.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.lineWidth = 3;
}
