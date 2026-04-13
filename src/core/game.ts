import { Piece } from './piece.js';
import { Move, EnPassantInfo } from './movement.js';

export type TurnPhase = 'player_turn' | 'enemy_turn';

export interface EnemyIntent {
  pieceId: string;
  move: Move;
  /** For sliders: the direction of movement (dr, dc). Used to keep intent predictable. */
  direction?: [number, number];
}

export interface GameState {
  pieces: Piece[];
  phase: TurnPhase;
  movesRemaining: number;
  maxMovesPerTurn: number;
  turnNumber: number;
  enemyIntents: EnemyIntent[];
  enPassants: EnPassantInfo[];
}

export function createGameState(pieces: Piece[]): GameState {
  return {
    pieces,
    phase: 'player_turn',
    movesRemaining: 2,
    maxMovesPerTurn: 2,
    turnNumber: 1,
    enemyIntents: [],
    enPassants: [],
  };
}

export function usePlayerMove(state: GameState): void {
  state.movesRemaining--;
}

export function isPlayerTurnOver(state: GameState): boolean {
  return state.movesRemaining <= 0;
}

export function startEnemyTurn(state: GameState): void {
  state.phase = 'enemy_turn';
}

export function startPlayerTurn(state: GameState): void {
  state.phase = 'player_turn';
  state.movesRemaining = state.maxMovesPerTurn;
  state.turnNumber++;
  // Reset per-turn capture flags for player pieces
  for (const piece of state.pieces) {
    if (piece.owner === 'player') {
      piece.hasCapturedThisTurn = false;
    }
  }
}
