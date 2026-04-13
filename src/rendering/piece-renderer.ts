import { Piece, PieceType, PIECE_LABELS } from '../core/piece.js';
import { CanvasContext } from './canvas.js';
import { getAnimatedPosition } from './animation.js';
import { getPieceImage } from './piece-images.js';

export function drawPieces(cc: CanvasContext, pieces: readonly Piece[]): void {
  for (const piece of pieces) {
    drawPiece(cc, piece);
  }
}

function drawPiece(cc: CanvasContext, piece: Piece): void {
  if (piece.position.row < 0 || piece.position.col < 0) return;

  const { ctx, squareSize } = cc;
  const animPos = getAnimatedPosition(piece.id);
  const drawCol = animPos ? animPos.col : piece.position.col;
  const drawRow = animPos ? animPos.row : piece.position.row;
  const x = cc.boardOriginX + drawCol * squareSize;
  const y = cc.boardOriginY + drawRow * squareSize;

  const exhausted = piece.owner === 'player' && piece.hasCapturedThisTurn;
  const img = getPieceImage(piece.owner, piece.type);

  if (img) {
    // Draw piece image with padding
    const padding = squareSize * 0.05;
    const imgSize = squareSize - padding * 2;

    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    if (exhausted) {
      ctx.globalAlpha = 0.4;
    }

    ctx.drawImage(img, x + padding, y + padding, imgSize, imgSize);
    ctx.restore();
  } else {
    // Fallback: text label
    const centerX = x + squareSize / 2;
    const centerY = y + squareSize / 2;
    ctx.fillStyle = exhausted ? '#666' : piece.owner === 'player' ? '#f5f0e0' : '#1a1a1a';
    ctx.font = `bold ${Math.floor(squareSize * 0.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PIECE_LABELS[piece.type], centerX, centerY);
  }

  // Modifier badge
  const playerMods = piece.modifiers.filter(m => !m.id.startsWith('artifact_'));
  if (playerMods.length > 0 && piece.owner === 'player') {
    const badgeR = squareSize * 0.1;
    const badgeX = x + squareSize - badgeR - 2;
    const badgeY = y + squareSize - badgeR - 2;
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
