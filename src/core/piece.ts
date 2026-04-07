import { Position } from '../utils/types.js';

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export type Owner = 'player' | 'enemy';

export interface Piece {
  id: string;
  type: PieceType;
  owner: Owner;
  lockedPosition: Position;
  position: Position;
  hasMoved: boolean;
}

export const PIECE_LABELS: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
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
  };
}
