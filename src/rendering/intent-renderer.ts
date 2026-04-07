import { Piece } from '../core/piece.js';
import { EnemyIntent } from '../core/game.js';
import { CanvasContext, boardToPixel } from './canvas.js';

const ARROW_COLOR = 'rgba(220, 50, 50, 0.7)';
const ARROW_HEAD_SIZE = 10;

export function drawIntents(
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
    const to = boardToPixel(cc, intent.move.to);

    const fromX = from.x + squareSize / 2;
    const fromY = from.y + squareSize / 2;
    const toX = to.x + squareSize / 2;
    const toY = to.y + squareSize / 2;

    drawArrow(ctx, fromX, fromY, toX, toY);

    // Order badge on the source piece
    const badgeRadius = squareSize * 0.14;
    const badgeX = from.x + squareSize - badgeRadius - 2;
    const badgeY = from.y + badgeRadius + 2;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220, 50, 50, 0.85)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(squareSize * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}`, badgeX, badgeY);
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  // Line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = ARROW_COLOR;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - ARROW_HEAD_SIZE * Math.cos(angle - Math.PI / 6),
    toY - ARROW_HEAD_SIZE * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - ARROW_HEAD_SIZE * Math.cos(angle + Math.PI / 6),
    toY - ARROW_HEAD_SIZE * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = ARROW_COLOR;
  ctx.fill();
}
