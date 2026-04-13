import { Piece, PIECE_LABELS } from '../core/piece.js';
import { CanvasContext } from './canvas.js';
import { getAnimatedPosition } from './animation.js';

const PLAYER_COLOR = '#4a90d9';
const PLAYER_GRADIENT_TOP = '#5aa8f0';
const PLAYER_GRADIENT_BOT = '#3670a8';
const PLAYER_EXHAUSTED_COLOR = '#3a5a7a';
const ENEMY_COLOR = '#d94a4a';
const ENEMY_GRADIENT_TOP = '#e86060';
const ENEMY_GRADIENT_BOT = '#b03030';
const PIECE_RADIUS_RATIO = 0.38;

export function drawPieces(cc: CanvasContext, pieces: readonly Piece[]): void {
  for (const piece of pieces) {
    drawPiece(cc, piece);
  }
}

function drawPiece(cc: CanvasContext, piece: Piece): void {
  // Don't draw pieces that are off-board (e.g. king waiting for teleport)
  if (piece.position.row < 0 || piece.position.col < 0) return;

  const { ctx, squareSize } = cc;
  const animPos = getAnimatedPosition(piece.id);
  const drawCol = animPos ? animPos.col : piece.position.col;
  const drawRow = animPos ? animPos.row : piece.position.row;
  const x = cc.boardOriginX + drawCol * squareSize;
  const y = cc.boardOriginY + drawRow * squareSize;
  const centerX = x + squareSize / 2;
  const centerY = y + squareSize / 2;
  const radius = squareSize * PIECE_RADIUS_RATIO;

  const exhausted = piece.owner === 'player' && piece.hasCapturedThisTurn;
  const isPlayer = piece.owner === 'player';

  // Shadow
  ctx.beginPath();
  ctx.arc(centerX + 2, centerY + 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fill();

  // Circle with gradient
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

  if (exhausted) {
    ctx.fillStyle = PLAYER_EXHAUSTED_COLOR;
  } else {
    const grad = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1, centerX, centerY, radius);
    if (isPlayer) {
      grad.addColorStop(0, PLAYER_GRADIENT_TOP);
      grad.addColorStop(1, PLAYER_GRADIENT_BOT);
    } else {
      grad.addColorStop(0, ENEMY_GRADIENT_TOP);
      grad.addColorStop(1, ENEMY_GRADIENT_BOT);
    }
    ctx.fillStyle = grad;
  }
  ctx.fill();

  // Border
  ctx.strokeStyle = exhausted ? '#2a3a4a' : isPlayer ? '#2a5080' : '#802020';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shine highlight
  if (!exhausted) {
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.2, centerY - radius * 0.25, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
  }

  // Letter
  const label = PIECE_LABELS[piece.type];
  ctx.fillStyle = exhausted ? '#777' : '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.35)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow
  if (!exhausted) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(label, centerX + 1, centerY + 1);
    ctx.fillStyle = '#fff';
  }
  ctx.fillText(label, centerX, centerY);

  // Modifier badge (purple dot with count, bottom-right)
  const playerMods = piece.modifiers.filter(m => !m.id.startsWith('artifact_'));
  if (playerMods.length > 0 && piece.owner === 'player') {
    const badgeR = squareSize * 0.1;
    const badgeX = centerX + radius * 0.7;
    const badgeY = centerY + radius * 0.7;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR + 1, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(badgeR * 1.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${playerMods.length}`, badgeX, badgeY);
  }
}
