import { ModifierDef } from '../core/modifier.js';

export const ALL_MODIFIERS: ModifierDef[] = [
  // ─── Pawn ──────────────────────────────────────
  {
    id: 'pawn_sidestep',
    name: 'Sidestep',
    description: 'Pawn can step 1 square sideways',
    cost: 3,
    pieceType: 'pawn',
    ability: { type: 'step', directions: 'orthogonal', maxRange: 1, canCapture: false, canMoveWithoutCapture: true },
  },
  {
    id: 'pawn_charge',
    name: 'Pawn Charge',
    description: 'Pawn slides up to 3 forward',
    cost: 4,
    pieceType: 'pawn',
    ability: { type: 'slide', directions: 'forward', maxRange: 3, canCapture: false, canMoveWithoutCapture: true },
  },

  // ─── Knight ────────────────────────────────────
  {
    id: 'knight_kings_step',
    name: "Knight's Grace",
    description: 'Knight can step 1 square any direction',
    cost: 5,
    pieceType: 'knight',
    ability: { type: 'step', directions: 'all', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'knight_diagonal_slide',
    name: 'Flanking Gallop',
    description: 'Knight gains diagonal sliding',
    cost: 7,
    pieceType: 'knight',
    ability: { type: 'slide', directions: 'diagonal', canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── Bishop ────────────────────────────────────
  {
    id: 'bishop_long_diagonal',
    name: 'Far Sight',
    description: 'Bishop slides up to 2 orthogonally',
    cost: 5,
    pieceType: 'bishop',
    ability: { type: 'slide', directions: 'orthogonal', maxRange: 2, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'bishop_knight_jump',
    name: 'Holy Leap',
    description: 'Bishop gains knight jump',
    cost: 6,
    pieceType: 'bishop',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── Rook ──────────────────────────────────────
  {
    id: 'rook_diagonal_step',
    name: 'Corner Guard',
    description: 'Rook can step 1 diagonally',
    cost: 4,
    pieceType: 'rook',
    ability: { type: 'step', directions: 'diagonal', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'rook_knight_jump',
    name: 'Catapult',
    description: 'Rook gains knight jump',
    cost: 6,
    pieceType: 'rook',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── Queen ─────────────────────────────────────
  {
    id: 'queen_knight_jump',
    name: 'Royal Chariot',
    description: 'Queen gains knight jump',
    cost: 8,
    pieceType: 'queen',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },

  // ─── King ──────────────────────────────────────
  {
    id: 'king_knight_jump',
    name: "King's Escape",
    description: 'King gains knight jump',
    cost: 5,
    pieceType: 'king',
    ability: { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  },
  {
    id: 'king_diagonal_slide',
    name: 'Royal Dash',
    description: 'King slides up to 2 diagonally',
    cost: 6,
    pieceType: 'king',
    ability: { type: 'slide', directions: 'diagonal', maxRange: 2, canCapture: true, canMoveWithoutCapture: true },
  },
];
