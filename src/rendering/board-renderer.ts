import { Position, BOARD_SIZE } from '../utils/types.js';
import { getSquareColor, positionEquals } from '../core/board.js';
import { Move } from '../core/movement.js';
import { CanvasContext, boardToPixel } from './canvas.js';

const LIGHT_COLOR = '#f0d9b5';
const DARK_COLOR = '#b58863';
const SELECTED_COLOR = 'rgba(255, 255, 100, 0.45)';
const MOVE_DOT_COLOR = 'rgba(0, 0, 0, 0.25)';
const CAPTURE_COLOR = 'rgba(220, 50, 50, 0.45)';

export function drawBoard(
  cc: CanvasContext,
  selectedPos: Position | null,
  legalMoves: readonly Move[],
): void {
  const { ctx, squareSize } = cc;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const pos = { row, col };
      const color = getSquareColor(pos);
      const { x, y } = boardToPixel(cc, pos);

      ctx.fillStyle = color === 'light' ? LIGHT_COLOR : DARK_COLOR;
      ctx.fillRect(x, y, squareSize, squareSize);

      // Highlight selected square
      if (selectedPos && positionEquals(pos, selectedPos)) {
        ctx.fillStyle = SELECTED_COLOR;
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }
  }

  // Draw legal move indicators
  for (const move of legalMoves) {
    const { x, y } = boardToPixel(cc, move.to);
    const centerX = x + squareSize / 2;
    const centerY = y + squareSize / 2;

    if (move.capturedPieceId) {
      // Capture: ring around the square
      ctx.fillStyle = CAPTURE_COLOR;
      ctx.fillRect(x, y, squareSize, squareSize);
    } else {
      // Move: small dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, squareSize * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = MOVE_DOT_COLOR;
      ctx.fill();
    }
  }
}
