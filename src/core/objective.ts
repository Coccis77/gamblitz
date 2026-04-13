import { Piece, PieceType } from './piece.js';

export type ObjectiveType =
  | { kind: 'capture_all' }
  | { kind: 'capture_type'; pieceType: PieceType }
  | { kind: 'survive'; turns: number }
  | { kind: 'capture_count'; count: number }
  | { kind: 'promote_pawn' }
  | { kind: 'defeat_king'; hp: number };

export interface Objective {
  type: ObjectiveType;
  description: string;
}

export interface ObjectiveProgress {
  capturedCount: number;
  turnsElapsed: number;
  reachedRank: boolean;
  enemyKingDefeated: boolean;
  initialEnemyCount: number;
  enemyPawnsPromotedOff: number;
}

export function createObjectiveProgress(): ObjectiveProgress {
  return { capturedCount: 0, turnsElapsed: 0, reachedRank: false, enemyKingDefeated: false, initialEnemyCount: 0, enemyPawnsPromotedOff: 0 };
}

export function describeObjective(obj: ObjectiveType): string {
  switch (obj.kind) {
    case 'capture_all': return 'Capture all enemy pieces';
    case 'capture_type': return `Capture all enemy ${obj.pieceType}s`;
    case 'survive': return `Survive ${obj.turns} turns`;
    case 'capture_count': return `Capture ${obj.count} pieces`;
    case 'promote_pawn': return 'Get a pawn or king to the enemy back rank';
    case 'defeat_king': return `Defeat the enemy king (${obj.hp} HP)`;
  }
}

export function isObjectiveComplete(
  obj: ObjectiveType,
  pieces: readonly Piece[],
  progress: ObjectiveProgress,
): boolean {
  switch (obj.kind) {
    case 'capture_all':
      return progress.capturedCount + progress.enemyPawnsPromotedOff >= progress.initialEnemyCount;
    case 'capture_type':
      // Still check the board — promoted pawns change type, so board check is fine for non-pawn types
      return pieces.filter(p => p.owner === 'enemy' && p.type === obj.pieceType).length === 0;
    case 'survive':
      return progress.turnsElapsed >= obj.turns || progress.capturedCount + progress.enemyPawnsPromotedOff >= progress.initialEnemyCount;
    case 'capture_count':
      return progress.capturedCount >= obj.count;
    case 'promote_pawn':
      return pieces.some(p => p.owner === 'player' && (p.type === 'pawn' || p.type === 'king') && p.position.row === 0);
    case 'defeat_king':
      return progress.enemyKingDefeated;
  }
}

export function createObjective(type: ObjectiveType): Objective {
  return { type, description: describeObjective(type) };
}
