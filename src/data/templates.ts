import { PieceType } from '../core/piece.js';
import { ObjectiveType } from '../core/objective.js';
import { Position } from '../utils/types.js';

export interface EnemyPlacement {
  type: PieceType;
  position: Position;
}

export interface LevelTemplate {
  name: string;
  enemies: EnemyPlacement[];
  objective: ObjectiveType;
  isBoss?: boolean;
}

export const LEVEL_TEMPLATES: LevelTemplate[] = [
  {
    name: 'Pawn Wall',
    enemies: [
      { type: 'pawn', position: { row: 1, col: 0 } },
      { type: 'pawn', position: { row: 1, col: 1 } },
      { type: 'pawn', position: { row: 1, col: 2 } },
      { type: 'pawn', position: { row: 1, col: 3 } },
      { type: 'pawn', position: { row: 1, col: 4 } },
      { type: 'pawn', position: { row: 1, col: 5 } },
    ],
    objective: { kind: 'capture_all' },
  },
  {
    name: 'Bishop Hunt',
    enemies: [
      { type: 'bishop', position: { row: 0, col: 1 } },
      { type: 'bishop', position: { row: 0, col: 4 } },
      { type: 'pawn', position: { row: 1, col: 2 } },
      { type: 'pawn', position: { row: 1, col: 3 } },
    ],
    objective: { kind: 'capture_type', pieceType: 'bishop' },
  },
  {
    name: 'Hold the Line',
    enemies: [
      { type: 'rook', position: { row: 0, col: 0 } },
      { type: 'rook', position: { row: 0, col: 5 } },
      { type: 'pawn', position: { row: 1, col: 1 } },
      { type: 'pawn', position: { row: 1, col: 2 } },
      { type: 'pawn', position: { row: 1, col: 3 } },
      { type: 'pawn', position: { row: 1, col: 4 } },
    ],
    objective: { kind: 'survive', turns: 6 },
  },
  {
    name: 'Breakthrough',
    enemies: [
      { type: 'knight', position: { row: 0, col: 2 } },
      { type: 'knight', position: { row: 0, col: 3 } },
      { type: 'pawn', position: { row: 2, col: 1 } },
      { type: 'pawn', position: { row: 2, col: 4 } },
    ],
    objective: { kind: 'reach_rank', row: 0 },
  },
  {
    name: 'The Dark King',
    isBoss: true,
    enemies: [
      { type: 'king', position: { row: 0, col: 3 } },
      { type: 'rook', position: { row: 0, col: 0 } },
      { type: 'bishop', position: { row: 0, col: 5 } },
      { type: 'knight', position: { row: 0, col: 1 } },
      { type: 'pawn', position: { row: 1, col: 2 } },
      { type: 'pawn', position: { row: 1, col: 3 } },
      { type: 'pawn', position: { row: 1, col: 4 } },
    ],
    objective: { kind: 'defeat_king', hp: 3 },
  },
];
