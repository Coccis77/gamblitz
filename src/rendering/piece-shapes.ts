/**
 * Modern chess piece shapes drawn with Canvas paths.
 * Each function draws a piece centered at (0, 0) in a unit square of size 1.
 * Scale with ctx.scale(size, size) before calling.
 */

export function drawKingShape(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  // Base
  ctx.moveTo(-0.35, 0.4);
  ctx.lineTo(0.35, 0.4);
  ctx.lineTo(0.3, 0.32);
  ctx.lineTo(-0.3, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(-0.25, 0.32);
  ctx.lineTo(-0.2, 0.0);
  ctx.bezierCurveTo(-0.2, -0.15, -0.15, -0.2, 0, -0.2);
  ctx.bezierCurveTo(0.15, -0.2, 0.2, -0.15, 0.2, 0.0);
  ctx.lineTo(0.25, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cross
  ctx.fillRect(-0.03, -0.42, 0.06, 0.2);
  ctx.stroke();
  ctx.fillRect(-0.09, -0.36, 0.18, 0.06);
  ctx.stroke();
}

export function drawQueenShape(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  // Base
  ctx.moveTo(-0.35, 0.4);
  ctx.lineTo(0.35, 0.4);
  ctx.lineTo(0.3, 0.32);
  ctx.lineTo(-0.3, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(-0.25, 0.32);
  ctx.lineTo(-0.22, 0.0);
  ctx.bezierCurveTo(-0.22, -0.15, -0.15, -0.22, 0, -0.22);
  ctx.bezierCurveTo(0.15, -0.22, 0.22, -0.15, 0.22, 0.0);
  ctx.lineTo(0.25, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crown points
  const points = [-0.2, -0.1, 0, 0.1, 0.2];
  for (const px of points) {
    ctx.beginPath();
    ctx.arc(px, -0.3, 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

export function drawRookShape(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  // Base
  ctx.moveTo(-0.3, 0.4);
  ctx.lineTo(0.3, 0.4);
  ctx.lineTo(0.25, 0.32);
  ctx.lineTo(-0.25, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body (rectangle)
  ctx.beginPath();
  ctx.moveTo(-0.2, 0.32);
  ctx.lineTo(-0.2, -0.15);
  ctx.lineTo(0.2, -0.15);
  ctx.lineTo(0.2, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Battlement top
  ctx.beginPath();
  ctx.moveTo(-0.25, -0.15);
  ctx.lineTo(-0.25, -0.3);
  ctx.lineTo(-0.13, -0.3);
  ctx.lineTo(-0.13, -0.2);
  ctx.lineTo(-0.04, -0.2);
  ctx.lineTo(-0.04, -0.3);
  ctx.lineTo(0.04, -0.3);
  ctx.lineTo(0.04, -0.2);
  ctx.lineTo(0.13, -0.2);
  ctx.lineTo(0.13, -0.3);
  ctx.lineTo(0.25, -0.3);
  ctx.lineTo(0.25, -0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawBishopShape(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  // Base
  ctx.moveTo(-0.3, 0.4);
  ctx.lineTo(0.3, 0.4);
  ctx.lineTo(0.25, 0.32);
  ctx.lineTo(-0.25, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body (tapered)
  ctx.beginPath();
  ctx.moveTo(-0.2, 0.32);
  ctx.bezierCurveTo(-0.2, 0.1, -0.15, -0.1, 0, -0.25);
  ctx.bezierCurveTo(0.15, -0.1, 0.2, 0.1, 0.2, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top ball
  ctx.beginPath();
  ctx.arc(0, -0.3, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Slit
  ctx.beginPath();
  ctx.moveTo(-0.06, -0.05);
  ctx.lineTo(0.06, -0.15);
  ctx.lineWidth *= 0.7;
  ctx.stroke();
}

export function drawKnightShape(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  // Base
  ctx.moveTo(-0.3, 0.4);
  ctx.lineTo(0.3, 0.4);
  ctx.lineTo(0.25, 0.32);
  ctx.lineTo(-0.25, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Horse head
  ctx.beginPath();
  ctx.moveTo(-0.15, 0.32);
  ctx.lineTo(-0.15, 0.05);
  ctx.bezierCurveTo(-0.15, -0.1, -0.1, -0.2, -0.05, -0.28);
  // Ears
  ctx.lineTo(-0.1, -0.38);
  ctx.lineTo(0.0, -0.3);
  // Head top
  ctx.bezierCurveTo(0.1, -0.32, 0.18, -0.25, 0.2, -0.15);
  // Nose
  ctx.lineTo(0.22, -0.08);
  ctx.lineTo(0.15, -0.05);
  // Jaw
  ctx.bezierCurveTo(0.12, 0.05, 0.15, 0.15, 0.2, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.beginPath();
  ctx.arc(0.05, -0.18, 0.025, 0, Math.PI * 2);
  ctx.fillStyle === ctx.strokeStyle ? ctx.fill() : (() => { const s = ctx.fillStyle; ctx.fillStyle = ctx.strokeStyle; ctx.fill(); ctx.fillStyle = s; })();
}

export function drawPawnShape(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  // Base
  ctx.moveTo(-0.28, 0.4);
  ctx.lineTo(0.28, 0.4);
  ctx.lineTo(0.22, 0.32);
  ctx.lineTo(-0.22, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body (narrow column)
  ctx.beginPath();
  ctx.moveTo(-0.12, 0.32);
  ctx.lineTo(-0.1, 0.05);
  ctx.bezierCurveTo(-0.1, -0.05, -0.08, -0.1, 0, -0.12);
  ctx.bezierCurveTo(0.08, -0.1, 0.1, -0.05, 0.1, 0.05);
  ctx.lineTo(0.12, 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head (circle)
  ctx.beginPath();
  ctx.arc(0, -0.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
