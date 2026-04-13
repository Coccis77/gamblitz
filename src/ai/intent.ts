import { Piece } from '../core/piece.js';
import { Move, getLegalMoves } from '../core/movement.js';
import { EnemyIntent } from '../core/game.js';
import { getPieceValue } from './priority.js';
import { Position } from '../utils/types.js';

/**
 * Compute intents for all enemy pieces using a simple priority list:
 * 1. Capture highest-value player piece in range
 * 2. Move toward nearest high-value target
 * 3. Advance toward player king
 * 4. Advance pawns forward
 * 5. Hold position (no intent)
 */
export function computeAllIntents(pieces: readonly Piece[]): EnemyIntent[] {
  const enemies = pieces.filter(p => p.owner === 'enemy');
  const intents: EnemyIntent[] = [];
  const claimedSquares = new Set<string>();

  for (const enemy of enemies) {
    const intent = computeIntent(enemy, pieces, claimedSquares);
    if (intent) {
      intents.push(intent);
      claimedSquares.add(`${intent.move.to.row},${intent.move.to.col}`);
    }
  }

  return intents;
}

function computeIntent(enemy: Piece, allPieces: readonly Piece[], claimedSquares: ReadonlySet<string>): EnemyIntent | null {
  const allMoves = getLegalMoves(enemy, allPieces);
  // Exclude squares already claimed by other enemy intents (captures are still allowed — two enemies can target the same enemy piece)
  const moves = allMoves.filter(m => {
    if (m.capturedPieceId) return true; // captures always allowed
    return !claimedSquares.has(`${m.to.row},${m.to.col}`);
  });
  if (moves.length === 0) return null;

  // Priority 1: capture highest-value player piece
  const captureMove = bestCapture(moves, allPieces);
  if (captureMove) {
    return { pieceId: enemy.id, move: captureMove };
  }

  // Priority 2-3: move toward highest-value player piece (king first)
  const playerPieces = allPieces.filter(p => p.owner === 'player');
  const approachMove = moveTowardTarget(enemy, moves, playerPieces);
  if (approachMove) {
    return { pieceId: enemy.id, move: approachMove };
  }

  // Priority 4: advance pawns forward (enemy forward = +row)
  if (enemy.type === 'pawn') {
    const forwardMove = moves.find(m => m.to.row > enemy.position.row && !m.capturedPieceId);
    if (forwardMove) {
      return { pieceId: enemy.id, move: forwardMove };
    }
  }

  // Priority 5: hold position
  return null;
}

function bestCapture(moves: Move[], allPieces: readonly Piece[]): Move | null {
  let best: Move | null = null;
  let bestValue = -1;

  for (const move of moves) {
    if (!move.capturedPieceId) continue;
    const target = allPieces.find(p => p.id === move.capturedPieceId);
    if (!target) continue;
    const value = getPieceValue(target.type);
    if (value > bestValue) {
      bestValue = value;
      best = move;
    }
  }

  return best;
}

function distance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function moveTowardTarget(enemy: Piece, moves: Move[], playerPieces: readonly Piece[]): Move | null {
  if (playerPieces.length === 0) return null;

  // Sort player pieces by value descending — prefer approaching king
  const sortedTargets = [...playerPieces].sort((a, b) => getPieceValue(b.type) - getPieceValue(a.type));
  const primaryTarget = sortedTargets[0];
  if (!primaryTarget) return null;

  // Pick the move that gets closest to the primary target
  let bestMove: Move | null = null;
  let bestDist = distance(enemy.position, primaryTarget.position);

  for (const move of moves) {
    if (move.capturedPieceId) continue; // already handled
    const dist = distance(move.to, primaryTarget.position);
    if (dist < bestDist) {
      bestDist = dist;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Recalculate enemy intents after a player move.
 * Keep the original intent if the exact move is still legal (same target, same capture status).
 * Otherwise recompute — this catches pieces placed in the way (new capture) or blocking the path.
 */
export function recalculateIntents(
  currentIntents: readonly EnemyIntent[],
  pieces: readonly Piece[],
): EnemyIntent[] {
  const enemies = pieces.filter(p => p.owner === 'enemy');
  const newIntents: EnemyIntent[] = [];
  const claimedSquares = new Set<string>();

  for (const enemy of enemies) {
    const existing = currentIntents.find(i => i.pieceId === enemy.id);
    const legalMoves = getLegalMoves(enemy, pieces);

    if (existing) {
      // Keep intent if the target square is still reachable and not claimed
      const key = `${existing.move.to.row},${existing.move.to.col}`;
      const sameTarget = legalMoves.find(
        m => m.to.row === existing.move.to.row && m.to.col === existing.move.to.col,
      );
      if (sameTarget && (!claimedSquares.has(key) || sameTarget.capturedPieceId)) {
        newIntents.push({ pieceId: enemy.id, move: sameTarget });
        claimedSquares.add(key);
        continue;
      }
    }

    // Original intent is no longer valid — recompute
    const intent = computeIntent(enemy, pieces, claimedSquares);
    if (intent) {
      newIntents.push(intent);
      claimedSquares.add(`${intent.move.to.row},${intent.move.to.col}`);
    }
  }

  return newIntents;
}
