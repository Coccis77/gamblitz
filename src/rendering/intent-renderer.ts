import { Piece } from '../core/piece.js';
import { EnemyIntent } from '../core/game.js';
import { CanvasContext, boardToPixel } from './canvas.js';

/* ── colour palette ─────────────────────────────────────────────── */
const CAPTURE_COLOR_FROM = 'rgba(255, 60, 40, 0.55)';
const CAPTURE_COLOR_TO   = 'rgba(255, 60, 40, 0.95)';
const MOVE_COLOR_FROM    = 'rgba(255, 160, 40, 0.40)';
const MOVE_COLOR_TO      = 'rgba(255, 160, 40, 0.85)';
const CAPTURE_LINE_WIDTH = 5;
const MOVE_LINE_WIDTH    = 3;
const ARROW_HEAD_ANGLE   = Math.PI / 5;  // 36° — wider, more visible head

/* ── public API ──────────────────────────────────────────────────── */

export function drawIntents(
  cc: CanvasContext,
  intents: readonly EnemyIntent[],
  pieces: readonly Piece[],
): void {
  const { ctx, squareSize } = cc;
  const pulse = pulseFactor();

  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i]!;
    const piece = pieces.find(p => p.id === intent.pieceId);
    if (!piece) continue;

    const isCapture = intent.move.capturedPieceId !== null;

    const from = boardToPixel(cc, piece.position);
    const to   = boardToPixel(cc, intent.move.to);

    const fromCX = from.x + squareSize / 2;
    const fromCY = from.y + squareSize / 2;
    const toCX   = to.x + squareSize / 2;
    const toCY   = to.y + squareSize / 2;

    /* ---------- target-square glow ---------- */
    drawTargetGlow(ctx, to.x, to.y, squareSize, isCapture, pulse);

    /* ---------- gradient arrow ---------- */
    drawGradientArrow(
      ctx, fromCX, fromCY, toCX, toCY, squareSize,
      isCapture ? CAPTURE_COLOR_FROM : MOVE_COLOR_FROM,
      isCapture ? CAPTURE_COLOR_TO   : MOVE_COLOR_TO,
      isCapture ? CAPTURE_LINE_WIDTH : MOVE_LINE_WIDTH,
    );
  }
}

/** Draw order badges on top of pieces — call AFTER drawPieces. */
export function drawIntentBadges(
  cc: CanvasContext,
  intents: readonly EnemyIntent[],
  pieces: readonly Piece[],
): void {
  const { ctx, squareSize } = cc;

  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i]!;
    const piece = pieces.find(p => p.id === intent.pieceId);
    if (!piece) continue;

    const from = boardToPixel(cc, piece.position);
    drawBadge(ctx, from.x, from.y, squareSize, i + 1);
  }
}

/* ── internals ───────────────────────────────────────────────────── */

/**
 * Returns a 0-1 factor that oscillates smoothly, used for pulse effects.
 */
function pulseFactor(): number {
  return (Math.sin(Date.now() / 300) + 1) / 2;  // 0 → 1, ~3.3 Hz cycle
}

/**
 * Draw a coloured glow over the target square.
 * Capture targets pulse in red; move targets show a softer orange overlay.
 */
function drawTargetGlow(
  ctx: CanvasRenderingContext2D,
  squareX: number,
  squareY: number,
  size: number,
  isCapture: boolean,
  pulse: number,
): void {
  ctx.save();

  if (isCapture) {
    // Pulsing red glow — alpha oscillates between 0.12 and 0.35
    const alpha = 0.12 + pulse * 0.23;
    ctx.fillStyle = `rgba(255, 40, 30, ${alpha})`;
    ctx.fillRect(squareX, squareY, size, size);

    // Bright border that pulses
    const borderAlpha = 0.35 + pulse * 0.45;
    ctx.strokeStyle = `rgba(255, 50, 30, ${borderAlpha})`;
    ctx.lineWidth = 2.5;
    const inset = 1.5;
    ctx.strokeRect(squareX + inset, squareY + inset, size - inset * 2, size - inset * 2);
  } else {
    // Static soft orange overlay for move targets
    ctx.fillStyle = 'rgba(255, 170, 50, 0.15)';
    ctx.fillRect(squareX, squareY, size, size);

    ctx.strokeStyle = 'rgba(255, 170, 50, 0.35)';
    ctx.lineWidth = 1.5;
    const inset = 1;
    ctx.strokeRect(squareX + inset, squareY + inset, size - inset * 2, size - inset * 2);
  }

  ctx.restore();
}

/**
 * Draw an arrow from (fromX,fromY) to (toX,toY) with a linear gradient
 * along its length and a filled triangular head.
 */
function drawGradientArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  squareSize: number,
  colorFrom: string,
  colorTo: string,
  lineWidth: number,
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  const headSize = Math.max(squareSize * 0.18, 12);

  // Shorten line so it ends at the base of the arrowhead
  const tipX = toX - headSize * 0.4 * Math.cos(angle);
  const tipY = toY - headSize * 0.4 * Math.sin(angle);
  const lineEndX = toX - headSize * Math.cos(angle);
  const lineEndY = toY - headSize * Math.sin(angle);

  // Gradient along the arrow shaft
  const grad = ctx.createLinearGradient(fromX, fromY, tipX, tipY);
  grad.addColorStop(0, colorFrom);
  grad.addColorStop(1, colorTo);

  ctx.save();

  // Shaft
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.strokeStyle = grad;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Arrowhead (filled triangle)
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - headSize * Math.cos(angle - ARROW_HEAD_ANGLE),
    tipY - headSize * Math.sin(angle - ARROW_HEAD_ANGLE),
  );
  ctx.lineTo(
    tipX - headSize * Math.cos(angle + ARROW_HEAD_ANGLE),
    tipY - headSize * Math.sin(angle + ARROW_HEAD_ANGLE),
  );
  ctx.closePath();
  ctx.fillStyle = colorTo;
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a numbered order badge on the top-right of the source square.
 * Larger than before so it reads clearly even on small screens.
 */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  squareX: number,
  squareY: number,
  squareSize: number,
  order: number,
): void {
  const radius = squareSize * 0.19;
  const cx = squareX + squareSize - radius - 2;
  const cy = squareY + radius + 2;

  ctx.save();

  // Dark outline ring for contrast
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // Red badge fill
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220, 50, 50, 0.92)';
  ctx.fill();

  // Number
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.22)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${order}`, cx, cy + 1); // +1 optical vertical centering

  ctx.restore();
}
