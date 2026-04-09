import { Piece, PIECE_LABELS } from '../core/piece.js';
import { CanvasContext, boardToPixel } from './canvas.js';

const PLAYER_COLOR = '#4a90d9';
const PLAYER_EXHAUSTED_COLOR = '#3a5a7a';
const ENEMY_COLOR = '#d94a4a';
const PIECE_RADIUS_RATIO = 0.38;

export function drawPieces(cc: CanvasContext, pieces: readonly Piece[]): void {
  for (const piece of pieces) {
    drawPiece(cc, piece);
  }
}

function drawPiece(cc: CanvasContext, piece: Piece): void {
  const { ctx, squareSize } = cc;
  const { x, y } = boardToPixel(cc, piece.position);
  const centerX = x + squareSize / 2;
  const centerY = y + squareSize / 2;
  const radius = squareSize * PIECE_RADIUS_RATIO;

  // Circle
  const exhausted = piece.owner === 'player' && piece.hasCapturedThisTurn;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = exhausted ? PLAYER_EXHAUSTED_COLOR
    : piece.owner === 'player' ? PLAYER_COLOR : ENEMY_COLOR;
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Letter
  const label = PIECE_LABELS[piece.type];
  ctx.fillStyle = exhausted ? '#999' : '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.35)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, centerX, centerY);
}
