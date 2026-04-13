import { Position } from '../utils/types.js';
import { ModifierDef } from './modifier.js';

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export type Owner = 'player' | 'enemy';

export interface Piece {
  id: string;
  type: PieceType;
  owner: Owner;
  lockedPosition: Position;
  position: Position;
  hasMoved: boolean;
  hasCapturedThisTurn: boolean;
  modifiers: ModifierDef[];
}

export const PIECE_LABELS: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
};

/** Unicode chess piece symbols — use filled (black) glyphs for both, color via fillStyle. */
export const PIECE_SYMBOLS: Record<Owner, Record<PieceType, string>> = {
  player: {
    king: '\u265A',   // ♚
    queen: '\u265B',  // ♛
    rook: '\u265C',   // ♜
    bishop: '\u265D',  // ♝
    knight: '\u265E',  // ♞
    pawn: '\u265F',   // ♟
  },
  enemy: {
    king: '\u265A',   // ♚
    queen: '\u265B',  // ♛
    rook: '\u265C',   // ♜
    bishop: '\u265D',  // ♝
    knight: '\u265E',  // ♞
    pawn: '\u265F',   // ♟
  },
};

let nextId = 0;

export function createPiece(type: PieceType, owner: Owner, position: Position): Piece {
  return {
    id: `${owner}_${type}_${nextId++}`,
    type,
    owner,
    lockedPosition: { ...position },
    position: { ...position },
    hasMoved: false,
    hasCapturedThisTurn: false,
    modifiers: [],
  };
}
