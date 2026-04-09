import { Position, BOARD_SIZE } from '../utils/types.js';

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  squareSize: number;
  boardOriginX: number;
  boardOriginY: number;
}

const CANVAS_PADDING = 40;
const HUD_TOP = 56;
const HUD_BOTTOM = 70;

export function initCanvas(canvasId: string): CanvasContext {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) throw new Error(`Canvas element "${canvasId}" not found`);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  return resizeCanvas({ canvas, ctx, squareSize: 0, boardOriginX: 0, boardOriginY: 0 });
}

export function resizeCanvas(cc: CanvasContext): CanvasContext {
  const available = Math.min(window.innerWidth, window.innerHeight) - CANVAS_PADDING * 2;
  const boardSpace = available - HUD_TOP - HUD_BOTTOM;
  cc.squareSize = Math.floor(boardSpace / BOARD_SIZE);
  const boardPixels = cc.squareSize * BOARD_SIZE;
  cc.canvas.width = boardPixels;
  cc.canvas.height = HUD_TOP + boardPixels + HUD_BOTTOM;
  cc.boardOriginX = 0;
  cc.boardOriginY = HUD_TOP;
  return cc;
}

/** Convert a board position to pixel coordinates (top-left of the square). */
export function boardToPixel(cc: CanvasContext, pos: Position): { x: number; y: number } {
  return {
    x: cc.boardOriginX + pos.col * cc.squareSize,
    y: cc.boardOriginY + pos.row * cc.squareSize,
  };
}

/** Convert pixel coordinates to a board position, or null if outside the board. */
export function pixelToBoard(cc: CanvasContext, x: number, y: number): Position | null {
  const col = Math.floor((x - cc.boardOriginX) / cc.squareSize);
  const row = Math.floor((y - cc.boardOriginY) / cc.squareSize);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}
