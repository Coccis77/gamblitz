import { Position, BOARD_SIZE } from '../utils/types.js';
import { isInBounds } from '../core/board.js';
import { Piece } from '../core/piece.js';
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
 * Find a safe square for a king to teleport to after being hit.
 * Safe = in bounds, not occupied, not adjacent to any enemy piece, not in direct attack line.
 */
export function findSafeSquare(
  king: Piece,
  allPieces: readonly Piece[],
  rng: RngFn,
): Position | null {
  const enemies = allPieces.filter(p => p.owner !== king.owner);
  const occupied = new Set(allPieces.map(p => `${p.position.row},${p.position.col}`));

  // Build set of squares attacked/adjacent to enemies
  const threatened = new Set<string>();
  for (const enemy of enemies) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = enemy.position.row + dr;
        const c = enemy.position.col + dc;
        if (isInBounds({ row: r, col: c })) {
          threatened.add(`${r},${c}`);
        }
      }
    }
  }

  const candidates: Position[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const key = `${row},${col}`;
      if (occupied.has(key)) continue;
      if (threatened.has(key)) continue;
      candidates.push({ row, col });
    }
  }

  return pick(candidates, rng) ?? null;
}

/**
 * Handle a king being "captured": deal damage and teleport.
 * Returns true if the king survived (teleported), false if defeated.
 */
export function handleKingHit(
  king: Piece,
  hp: KingHP,
  allPieces: Piece[],
  rng: RngFn,
): boolean {
  damageKing(hp, 1);

  if (isKingDefeated(hp)) return false;

  const safeSq = findSafeSquare(king, allPieces, rng);
  if (safeSq) {
    king.position = { ...safeSq };
  }
  return true;
}
