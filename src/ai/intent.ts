import { Piece } from '../core/piece.js';
import { Move, getLegalMoves } from '../core/movement.js';
import { EnemyIntent } from '../core/game.js';
import { getPieceValue } from './priority.js';
import { Position } from '../utils/types.js';

const SLIDER_TYPES = new Set(['rook', 'queen', 'bishop']);

function isSlider(piece: Piece): boolean {
  return SLIDER_TYPES.has(piece.type);
}

/** Compute direction vector from one position to another. */
function getDirection(from: Position, to: Position): [number, number] {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  // Normalize to unit direction
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  return len === 0 ? [0, 0] : [Math.sign(dr), Math.sign(dc)];
}

/**
 * For a slider, find the farthest legal move in a given direction.
 * Prefers captures — if a capture exists along the line, take it.
 * Otherwise, go as far as possible.
 */
function farthestInDirection(
  piece: Piece,
  moves: readonly Move[],
  dir: [number, number],
): Move | null {
  const [dr, dc] = dir;
  if (dr === 0 && dc === 0) return null;

  // Filter moves along this direction
  const inLine = moves.filter(m => {
    const mdr = m.to.row - piece.position.row;
    const mdc = m.to.col - piece.position.col;
    if (mdr === 0 && mdc === 0) return false;
    return Math.sign(mdr) === dr && Math.sign(mdc) === dc;
  });

  if (inLine.length === 0) return null;

  // If there's a capture along this line, take it (it's necessarily the first one the slider hits)
  const capture = inLine.find(m => m.capturedPieceId);
  if (capture) return capture;

  // Otherwise pick farthest
  let farthest = inLine[0]!;
  let farthestDist = 0;
  for (const m of inLine) {
    const dist = Math.abs(m.to.row - piece.position.row) + Math.abs(m.to.col - piece.position.col);
    if (dist > farthestDist) {
      farthestDist = dist;
      farthest = m;
    }
  }
  return farthest;
}

/**
 * For a slider, pick the best direction and go as far as possible.
 * Prefer directions with captures, then directions toward the primary target.
 */
function sliderIntent(
  enemy: Piece,
  moves: readonly Move[],
  allPieces: readonly Piece[],
  claimedSquares: ReadonlySet<string>,
): EnemyIntent | null {
  // All 8 possible directions
  const dirs: [number, number][] = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  // Find primary target
  const playerPieces = allPieces.filter(p => p.owner === 'player');
  const sortedTargets = [...playerPieces].sort((a, b) => getPieceValue(b.type) - getPieceValue(a.type));
  const primaryTarget = sortedTargets[0];

  // Score each direction
  let bestIntent: EnemyIntent | null = null;
  let bestScore = -Infinity;

  for (const dir of dirs) {
    const move = farthestInDirection(enemy, moves, dir);
    if (!move) continue;

    // Skip if non-capture square is claimed
    if (!move.capturedPieceId && claimedSquares.has(`${move.to.row},${move.to.col}`)) continue;

    let score = 0;

    // Captures are top priority, weighted by piece value
    if (move.capturedPieceId) {
      const target = allPieces.find(p => p.id === move.capturedPieceId);
      score = 1000 + (target ? getPieceValue(target.type) : 0);
    } else if (primaryTarget) {
      // Prefer directions that get closer to the primary target
      const currentDist = distance(enemy.position, primaryTarget.position);
      const newDist = distance(move.to, primaryTarget.position);
      score = (currentDist - newDist) * 10;
      // Small bonus for traveling far (sliders prefer long moves)
      score += Math.abs(move.to.row - enemy.position.row) + Math.abs(move.to.col - enemy.position.col);
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = { pieceId: enemy.id, move, direction: dir };
    }
  }

  return bestIntent;
}

// ─── Public API ──────────────────────────────────────────

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
  const moves = allMoves.filter(m => {
    if (m.capturedPieceId) return true;
    return !claimedSquares.has(`${m.to.row},${m.to.col}`);
  });
  if (moves.length === 0) return null;

  // Sliders use special logic: pick best direction, go farthest
  if (isSlider(enemy)) {
    return sliderIntent(enemy, moves, allPieces, claimedSquares);
  }

  // Priority 1: capture highest-value player piece
  const captureMove = bestCapture(moves, allPieces);
  if (captureMove) {
    return { pieceId: enemy.id, move: captureMove };
  }

  // Priority 2: move toward highest-value player piece
  const playerPieces = allPieces.filter(p => p.owner === 'player');
  const approachMove = moveTowardTarget(enemy, moves, playerPieces);
  if (approachMove) {
    return { pieceId: enemy.id, move: approachMove };
  }

  // Priority 3: advance pawns forward
  if (enemy.type === 'pawn') {
    const forwardMove = moves.find(m => m.to.row > enemy.position.row && !m.capturedPieceId);
    if (forwardMove) {
      return { pieceId: enemy.id, move: forwardMove };
    }
  }

  // Priority 4: any move
  const anyMove = moves.find(m => !m.capturedPieceId);
  if (anyMove) {
    return { pieceId: enemy.id, move: anyMove };
  }

  return null;
}

function bestCapture(moves: readonly Move[], allPieces: readonly Piece[]): Move | null {
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

function moveTowardTarget(enemy: Piece, moves: readonly Move[], playerPieces: readonly Piece[]): Move | null {
  if (playerPieces.length === 0) return null;

  const sortedTargets = [...playerPieces].sort((a, b) => getPieceValue(b.type) - getPieceValue(a.type));
  const primaryTarget = sortedTargets[0];
  if (!primaryTarget) return null;

  let bestMove: Move | null = null;
  let bestDist = distance(enemy.position, primaryTarget.position);

  for (const move of moves) {
    if (move.capturedPieceId) continue;
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
 * Sliders keep their direction if possible — predictable Into the Breach style.
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
      // For sliders with a stored direction: keep going in the same direction
      if (isSlider(enemy) && existing.direction) {
        const move = farthestInDirection(enemy, legalMoves, existing.direction);
        if (move) {
          const key = `${move.to.row},${move.to.col}`;
          if (!claimedSquares.has(key) || move.capturedPieceId) {
            newIntents.push({ pieceId: enemy.id, move, direction: existing.direction });
            claimedSquares.add(key);
            continue;
          }
        }
        // Direction blocked — fall through to full recompute
      } else {
        // Non-slider: keep same target if still reachable
        const sameTarget = legalMoves.find(
          m => m.to.row === existing.move.to.row && m.to.col === existing.move.to.col,
        );
        const key = `${existing.move.to.row},${existing.move.to.col}`;
        if (sameTarget && (!claimedSquares.has(key) || sameTarget.capturedPieceId)) {
          newIntents.push({ pieceId: enemy.id, move: sameTarget });
          claimedSquares.add(key);
          continue;
        }
      }
    }

    // Recompute from scratch
    const intent = computeIntent(enemy, pieces, claimedSquares);
    if (intent) {
      newIntents.push(intent);
      claimedSquares.add(`${intent.move.to.row},${intent.move.to.col}`);
    }
  }

  return newIntents;
}
