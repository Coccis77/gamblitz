import { MovementAbility } from './movement.js';
import { PieceType } from './piece.js';

export interface ModifierDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  pieceType: PieceType;
  ability: MovementAbility;
}

export const MAX_MODIFIER_SLOTS = 2;
