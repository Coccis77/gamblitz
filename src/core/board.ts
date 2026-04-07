import { Position, SquareColor, BOARD_SIZE } from '../utils/types.js';

export function getSquareColor(pos: Position): SquareColor {
  return (pos.row + pos.col) % 2 === 0 ? 'light' : 'dark';
}

export function isInBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

export function positionEquals(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}
