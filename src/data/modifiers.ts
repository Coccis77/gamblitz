import { ModifierDef } from '../core/modifier.js';

export const ALL_MODIFIERS: ModifierDef[] = [
  // ─── Pawn ──────────────────────────────────────
  {
    id: 'pawn_sidestep',
    name: 'Sidestep',
    description: 'Pawn can step 1 square sideways',
    cost: 5,
    pieceType: 'pawn',
    ability: { type: 'step', directions: 'orthogonal', maxRange: 1, canCapture: false, canMoveWithoutCapture: true },
  },
  {
    id: 'pawn_charge',
    name: 'Pawn Charge',
    description: 'Pawn slides up to 3 forward',
    cost: 6,
    pieceType: 'pawn',
    ability: { type: 'slide', directions: 'forward', maxRange: 3, canCapture: false, canMoveWithoutCapture: true },
  },
  {
    id: 'pawn_diagonal_step',
    name: 'Pawn Pivot',
    description: 'Pawn can step 1 diagonally without capturing',
    cost: 5,
    pieceType: 'pawn',
    ability: { type: 'step', directions: 'diagonal', maxRange: 1, canCapture: false, canMoveWithoutCapture: true },
  },
  {
    id: 'pawn_flanker',
    name: 'Pawn Flanker',
    description: 'Pawn can step 1 backward diagonally',
    cost: 5,
    pieceType: 'pawn',
    ability: { type: 'step', directions: 'backward-diagonal', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── Knight ────────────────────────────────────
  {
    id: 'knight_kings_step',
    name: "Knight's Grace",
    description: 'Knight can step 1 square any direction',
    cost: 8,
    pieceType: 'knight',
    ability: { type: 'step', directions: 'all', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'knight_diagonal_slide',
    name: 'Flanking Gallop',
    description: 'Knight gains diagonal sliding',
    cost: 12,
    pieceType: 'knight',
    ability: { type: 'slide', directions: 'diagonal', canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'knight_charge',
    name: 'Knight Charge',
    description: 'Knight can slide up to 2 forward',
    cost: 7,
    pieceType: 'knight',
    ability: { type: 'slide', directions: 'forward', maxRange: 2, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── Bishop ────────────────────────────────────
  {
    id: 'bishop_guard',
    name: "Bishop's Guard",
    description: 'Bishop can step 1 square in any direction',
    cost: 7,
    pieceType: 'bishop',
    ability: { type: 'step', directions: 'all', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'bishop_knight_jump',
    name: 'Holy Leap',
    description: 'Bishop gains knight jump',
    cost: 9,
    pieceType: 'bishop',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── Rook ──────────────────────────────────────
  {
    id: 'rook_diagonal_step',
    name: 'Corner Guard',
    description: 'Rook can step 1 diagonally',
    cost: 7,
    pieceType: 'rook',
    ability: { type: 'step', directions: 'diagonal', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'rook_knight_jump',
    name: 'Catapult',
    description: 'Rook gains knight jump',
    cost: 10,
    pieceType: 'rook',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'rook_forward_charge',
    name: 'Battering Ram',
    description: 'Rook charges up to 4 forward',
    cost: 7,
    pieceType: 'rook',
    ability: { type: 'slide', directions: 'forward', maxRange: 4, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── Queen ─────────────────────────────────────
  {
    id: 'queen_long_jump',
    name: 'Royal Leap',
    description: 'Queen can jump like a knight',
    cost: 10,
    pieceType: 'queen',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── King ──────────────────────────────────────
  {
    id: 'king_knight_jump',
    name: "King's Escape",
    description: 'King gains knight jump',
    cost: 12,
    pieceType: 'king',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'king_diagonal_slide',
    name: 'Royal Dash',
    description: 'King slides up to 2 diagonally',
    cost: 10,
    pieceType: 'king',
    ability: { type: 'slide', directions: 'diagonal', maxRange: 2, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'king_orthogonal_slide',
    name: 'Royal Charge',
    description: 'King slides up to 2 orthogonally',
    cost: 8,
    pieceType: 'king',
    ability: { type: 'slide', directions: 'orthogonal', maxRange: 2, canCapture: true, canMoveWithoutCapture: true },
  },
];
