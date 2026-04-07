import { PieceType } from '../core/piece.js';

/** Higher = more valuable target. Used by AI to pick captures. */
const PIECE_VALUE: Record<PieceType, number> = {
  king: 100,
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
};

export function getPieceValue(type: PieceType): number {
  return PIECE_VALUE[type];
}
