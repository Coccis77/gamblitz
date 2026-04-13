import { Position, BOARD_SIZE } from '../utils/types.js';
import { getSquareColor, positionEquals } from '../core/board.js';
import { Move, getAttackSquares } from '../core/movement.js';
import { Piece } from '../core/piece.js';
import { CanvasContext, boardToPixel } from './canvas.js';

const THREAT_OVERLAY_COLOR = 'rgba(200, 40, 40, 0.12)';

export function computeThreatSquares(pieces: readonly Piece[]): Set<string> {
  const threats = new Set<string>();
  const enemies = pieces.filter(p => p.owner === 'enemy');
  for (const enemy of enemies) {
    const attacks = getAttackSquares(enemy, pieces);
    for (const sq of attacks) {
      threats.add(`${sq.row},${sq.col}`);
    }
  }
  return threats;
}

const LIGHT_COLOR = '#e8d5b0';
const DARK_COLOR = '#a87d52';
const SELECTED_COLOR = 'rgba(255, 230, 80, 0.5)';
const MOVE_DOT_COLOR = 'rgba(60, 60, 60, 0.35)';
const CAPTURE_COLOR = 'rgba(220, 50, 50, 0.4)';
const BORDER_COLOR = '#2a1f14';
const COORD_COLOR = 'rgba(255, 255, 255, 0.15)';

export function drawBoard(
  cc: CanvasContext,
  selectedPos: Position | null,
  legalMoves: readonly Move[],
  threatSquares: ReadonlySet<string> = new Set(),
): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;

  // Board shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(boardOriginX + 4, boardOriginY + 4, boardPixels, boardPixels);

  // Board border
  const border = 3;
  ctx.fillStyle = BORDER_COLOR;
  ctx.fillRect(boardOriginX - border, boardOriginY - border, boardPixels + border * 2, boardPixels + border * 2);

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const pos = { row, col };
      const color = getSquareColor(pos);
      const { x, y } = boardToPixel(cc, pos);

      // Base color with subtle inner shading
      const isLight = color === 'light';
      ctx.fillStyle = isLight ? LIGHT_COLOR : DARK_COLOR;
      ctx.fillRect(x, y, squareSize, squareSize);

      // Subtle top-left highlight
      const grad = ctx.createLinearGradient(x, y, x + squareSize, y + squareSize);
      grad.addColorStop(0, isLight ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, isLight ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, squareSize, squareSize);

      // Danger zone: subtle red tint for squares enemies can attack
      if (threatSquares.has(`${row},${col}`)) {
        ctx.fillStyle = THREAT_OVERLAY_COLOR;
        ctx.fillRect(x, y, squareSize, squareSize);
      }

      // Highlight selected square
      if (selectedPos && positionEquals(pos, selectedPos)) {
        ctx.fillStyle = SELECTED_COLOR;
        ctx.fillRect(x, y, squareSize, squareSize);
      }

      // Coordinate labels (bottom-left for letters, top-right for numbers)
      if (col === 0) {
        ctx.fillStyle = COORD_COLOR;
        ctx.font = `${Math.floor(squareSize * 0.15)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${BOARD_SIZE - row}`, x + 2, y + 2);
      }
      if (row === BOARD_SIZE - 1) {
        ctx.fillStyle = COORD_COLOR;
        ctx.font = `${Math.floor(squareSize * 0.15)}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String.fromCharCode(97 + col), x + squareSize - 2, y + squareSize - 2);
      }
    }
  }

  // Draw legal move indicators
  for (const move of legalMoves) {
    const { x, y } = boardToPixel(cc, move.to);
    const centerX = x + squareSize / 2;
    const centerY = y + squareSize / 2;

    if (move.capturedPieceId) {
      // Capture: colored corners
      ctx.fillStyle = CAPTURE_COLOR;
      ctx.fillRect(x, y, squareSize, squareSize);
      // Corner triangles for emphasis
      const s = squareSize * 0.2;
      ctx.fillStyle = 'rgba(220, 50, 50, 0.6)';
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + squareSize, y); ctx.lineTo(x + squareSize - s, y); ctx.lineTo(x + squareSize, y + s); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y + squareSize); ctx.lineTo(x + s, y + squareSize); ctx.lineTo(x, y + squareSize - s); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + squareSize, y + squareSize); ctx.lineTo(x + squareSize - s, y + squareSize); ctx.lineTo(x + squareSize, y + squareSize - s); ctx.closePath();
      ctx.fill();
    } else {
      // Move: ringed dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, squareSize * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = MOVE_DOT_COLOR;
      ctx.fill();
    }
  }
}
