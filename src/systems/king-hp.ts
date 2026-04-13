import { Position, BOARD_SIZE } from '../utils/types.js';
import { isInBounds } from '../core/board.js';
import { Piece } from '../core/piece.js';
import { getLegalMoves } from '../core/movement.js';
import { RngFn, pick } from '../utils/rng.js';

export interface KingHP {
  current: number;
  max: number;
}

export function createKingHP(max: number): KingHP {
  return { current: max, max };
}

export function damageKing(hp: KingHP, amount: number): void {
  hp.current = Math.max(0, hp.current - amount);
}

export function isKingDefeated(hp: KingHP): boolean {
  return hp.current <= 0;
}

/**
 * Find all safe squares for a king to teleport to.
 * Safe = not occupied, not attackable by any enemy piece.
 * Player king: restricted to bottom 2 rows.
 * The king is excluded from occupied/threat calculations (it's being removed).
 */
export function findSafeSquares(
  king: Piece,
  allPieces: readonly Piece[],
): Position[] {
  // Exclude the king itself from calculations
  const otherPieces = allPieces.filter(p => p.id !== king.id);
  const enemies = otherPieces.filter(p => p.owner !== king.owner);
  const occupied = new Set(otherPieces.map(p => `${p.position.row},${p.position.col}`));

  // Compute all squares threatened by enemy pieces using actual legal moves
  const threatened = new Set<string>();
  for (const enemy of enemies) {
    const moves = getLegalMoves(enemy, otherPieces);
    for (const m of moves) {
      threatened.add(`${m.to.row},${m.to.col}`);
    }
    // Also mark the enemy's own square as threatened (can't land on it)
    threatened.add(`${enemy.position.row},${enemy.position.col}`);
  }

  // Player king: bottom 2 rows. Enemy king: full board.
  const minRow = king.owner === 'player' ? BOARD_SIZE - 2 : 0;
  const maxRow = BOARD_SIZE - 1;

  const candidates: Position[] = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const key = `${row},${col}`;
      if (occupied.has(key)) continue;
      if (threatened.has(key)) continue;
      candidates.push({ row, col });
    }
  }

  return candidates;
}

/** Pick a random safe square (used for enemy king teleport). */
export function findSafeSquare(
  king: Piece,
  allPieces: readonly Piece[],
  rng: RngFn,
): Position | null {
  const candidates = findSafeSquares(king, allPieces);
  return pick(candidates, rng) ?? null;
}

export type KingHitResult =
  | { outcome: 'defeated' }
  | { outcome: 'teleported' }
  | { outcome: 'choose_teleport'; squares: Position[] }
  | { outcome: 'no_safe_square' };

/**
 * Handle a king being "captured": deal damage and teleport.
 * For enemy king: auto-teleports randomly.
 * For player king: returns safe squares for the player to choose.
 * The king is moved off-board (row -1) until placed.
 */
export function handleKingHit(
  king: Piece,
  hp: KingHP,
  allPieces: Piece[],
  rng: RngFn,
): KingHitResult {
  damageKing(hp, 1);

  if (isKingDefeated(hp)) return { outcome: 'defeated' };

  // Move king off-board while finding safe squares
  const savedPos = { ...king.position };
  king.position = { row: -1, col: -1 };

  if (king.owner === 'enemy') {
    const safeSq = findSafeSquare(king, allPieces, rng);
    if (safeSq) {
      king.position = { ...safeSq };
    } else {
      king.position = savedPos; // fallback
    }
    return { outcome: 'teleported' };
  }

  // Player king: let the player choose
  const squares = findSafeSquares(king, allPieces);
  if (squares.length === 0) {
    king.position = savedPos; // nowhere to go, stay put
    return { outcome: 'no_safe_square' };
  }
  // King stays at (-1,-1) until player picks — it won't render on the board
  return { outcome: 'choose_teleport', squares };
}
