import { PieceType } from '../core/piece.js';
import { ObjectiveType } from '../core/objective.js';
import { Position } from '../utils/types.js';
import { LevelType } from '../systems/run.js';

export interface EnemyPlacement {
  type: PieceType;
  position: Position;
}

export interface LevelTemplate {
  name: string;
  levelType: LevelType;
  enemies: EnemyPlacement[];
  objective: ObjectiveType;
}

// ─── Normal templates ────────────────────────────────────

export const NORMAL_TEMPLATES: LevelTemplate[] = [
  {
    name: 'Pawn Wall',
    levelType: 'normal',
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
    levelType: 'normal',
    enemies: [
      { type: 'bishop', position: { row: 0, col: 1 } },
      { type: 'bishop', position: { row: 0, col: 4 } },
      { type: 'pawn', position: { row: 1, col: 2 } },
      { type: 'pawn', position: { row: 1, col: 3 } },
    ],
    objective: { kind: 'capture_type', pieceType: 'bishop' },
  },
  {
    name: 'Breakthrough',
    levelType: 'normal',
    enemies: [
      { type: 'knight', position: { row: 0, col: 2 } },
      { type: 'knight', position: { row: 0, col: 3 } },
      { type: 'pawn', position: { row: 2, col: 1 } },
      { type: 'pawn', position: { row: 2, col: 4 } },
    ],
    objective: { kind: 'reach_rank', row: 0 },
  },
  {
    name: 'Knight Raid',
    levelType: 'normal',
    enemies: [
      { type: 'knight', position: { row: 0, col: 1 } },
      { type: 'knight', position: { row: 0, col: 4 } },
      { type: 'pawn', position: { row: 1, col: 0 } },
      { type: 'pawn', position: { row: 1, col: 5 } },
    ],
    objective: { kind: 'capture_count', count: 3 },
  },
];

// ─── Elite templates ─────────────────────────────────────

export const ELITE_TEMPLATES: LevelTemplate[] = [
  {
    name: 'Hold the Line',
    levelType: 'elite',
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
    name: 'Queen\'s Gambit',
    levelType: 'elite',
    enemies: [
      { type: 'queen', position: { row: 0, col: 3 } },
      { type: 'bishop', position: { row: 0, col: 1 } },
      { type: 'knight', position: { row: 0, col: 4 } },
      { type: 'pawn', position: { row: 1, col: 2 } },
      { type: 'pawn', position: { row: 1, col: 3 } },
    ],
    objective: { kind: 'capture_all' },
  },
  {
    name: 'Rook Fortress',
    levelType: 'elite',
    enemies: [
      { type: 'rook', position: { row: 0, col: 0 } },
      { type: 'rook', position: { row: 0, col: 5 } },
      { type: 'bishop', position: { row: 0, col: 2 } },
      { type: 'knight', position: { row: 1, col: 0 } },
      { type: 'pawn', position: { row: 2, col: 1 } },
      { type: 'pawn', position: { row: 2, col: 4 } },
    ],
    objective: { kind: 'capture_count', count: 5 },
  },
];

// ─── Boss templates ──────────────────────────────────────

export const BOSS_TEMPLATES: LevelTemplate[] = [
  {
    name: 'The Dark King',
    levelType: 'boss',
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
  {
    name: 'The Iron Queen',
    levelType: 'boss',
    enemies: [
      { type: 'king', position: { row: 0, col: 2 } },
      { type: 'queen', position: { row: 0, col: 3 } },
      { type: 'rook', position: { row: 0, col: 0 } },
      { type: 'bishop', position: { row: 0, col: 5 } },
      { type: 'pawn', position: { row: 1, col: 1 } },
      { type: 'pawn', position: { row: 1, col: 3 } },
      { type: 'pawn', position: { row: 1, col: 5 } },
    ],
    objective: { kind: 'defeat_king', hp: 3 },
  },
];
