import { describe, it, expect } from 'vitest';
import { getLegalMoves, Move, EnPassantInfo } from '../movement.js';
import { createPiece, Piece } from '../piece.js';
import { Position } from '../../utils/types.js';

/** Helper: extract sorted target positions from moves */
function targets(moves: Move[]): string[] {
  return moves.map(m => `${m.to.row},${m.to.col}`).sort();
}

function hasTarget(moves: Move[], row: number, col: number): boolean {
  return moves.some(m => m.to.row === row && m.to.col === col);
}

function captureTargets(moves: Move[]): string[] {
  return moves.filter(m => m.capturedPieceId !== null).map(m => `${m.to.row},${m.to.col}`).sort();
}

// ─── Pawn ────────────────────────────────────────────────

describe('pawn movement', () => {
  it('moves 1 square forward (player moves up)', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    pawn.hasMoved = true;
    const moves = getLegalMoves(pawn, [pawn]);
    expect(targets(moves)).toEqual(['3,2']);
  });

  it('moves 1 or 2 squares forward on first move', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    const moves = getLegalMoves(pawn, [pawn]);
    expect(hasTarget(moves, 3, 2)).toBe(true);
    expect(hasTarget(moves, 2, 2)).toBe(true);
  });

  it('loses double-step after first move', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    pawn.hasMoved = true;
    const moves = getLegalMoves(pawn, [pawn]);
    expect(hasTarget(moves, 2, 2)).toBe(false);
  });

  it('cannot move forward into a friendly piece', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    const blocker = createPiece('rook', 'player', { row: 3, col: 2 });
    const moves = getLegalMoves(pawn, [pawn, blocker]);
    expect(hasTarget(moves, 3, 2)).toBe(false);
  });

  it('cannot move forward into an enemy piece', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    const enemy = createPiece('rook', 'enemy', { row: 3, col: 2 });
    const moves = getLegalMoves(pawn, [pawn, enemy]);
    expect(hasTarget(moves, 3, 2)).toBe(false);
  });

  it('double-step blocked if square 1 is occupied', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    const blocker = createPiece('rook', 'enemy', { row: 3, col: 2 });
    const moves = getLegalMoves(pawn, [pawn, blocker]);
    expect(hasTarget(moves, 2, 2)).toBe(false);
  });

  it('captures diagonally', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    const enemy1 = createPiece('rook', 'enemy', { row: 3, col: 1 });
    const enemy2 = createPiece('rook', 'enemy', { row: 3, col: 3 });
    const moves = getLegalMoves(pawn, [pawn, enemy1, enemy2]);
    expect(captureTargets(moves)).toEqual(['3,1', '3,3']);
  });

  it('cannot capture diagonally into empty square', () => {
    const pawn = createPiece('pawn', 'player', { row: 4, col: 2 });
    pawn.hasMoved = true;
    const moves = getLegalMoves(pawn, [pawn]);
    expect(hasTarget(moves, 3, 1)).toBe(false);
    expect(hasTarget(moves, 3, 3)).toBe(false);
  });

  it('enemy pawn moves down (forward = +1 row)', () => {
    const pawn = createPiece('pawn', 'enemy', { row: 1, col: 2 });
    pawn.hasMoved = true;
    const moves = getLegalMoves(pawn, [pawn]);
    expect(targets(moves)).toEqual(['2,2']);
  });
});

// ─── Knight ──────────────────────────────────────────────

describe('knight movement', () => {
  it('has up to 8 moves from center', () => {
    const knight = createPiece('knight', 'player', { row: 3, col: 3 });
    const moves = getLegalMoves(knight, [knight]);
    expect(moves.length).toBe(8);
  });

  it('is limited by board edges', () => {
    const knight = createPiece('knight', 'player', { row: 0, col: 0 });
    const moves = getLegalMoves(knight, [knight]);
    expect(targets(moves)).toEqual(['1,2', '2,1']);
  });

  it('can jump over pieces', () => {
    const knight = createPiece('knight', 'player', { row: 5, col: 0 });
    // Surround with friendly pieces
    const blockers = [
      createPiece('pawn', 'player', { row: 4, col: 0 }),
      createPiece('pawn', 'player', { row: 4, col: 1 }),
      createPiece('pawn', 'player', { row: 5, col: 1 }),
    ];
    const moves = getLegalMoves(knight, [knight, ...blockers]);
    expect(hasTarget(moves, 3, 1)).toBe(true);
    expect(hasTarget(moves, 4, 2)).toBe(true);
  });

  it('captures enemy but not friendly pieces', () => {
    const knight = createPiece('knight', 'player', { row: 3, col: 3 });
    const friendly = createPiece('pawn', 'player', { row: 1, col: 2 });
    const enemy = createPiece('pawn', 'enemy', { row: 1, col: 4 });
    const moves = getLegalMoves(knight, [knight, friendly, enemy]);
    expect(hasTarget(moves, 1, 2)).toBe(false);
    expect(hasTarget(moves, 1, 4)).toBe(true);
    expect(captureTargets(moves)).toEqual(['1,4']);
  });
});

// ─── Rook ────────────────────────────────────────────────

describe('rook movement', () => {
  it('slides orthogonally across the board', () => {
    const rook = createPiece('rook', 'player', { row: 3, col: 3 });
    const moves = getLegalMoves(rook, [rook]);
    // 5 up/down (0-2, 4-5) + 5 left/right (0-2, 4-5)
    expect(moves.length).toBe(10);
  });

  it('is blocked by friendly piece', () => {
    const rook = createPiece('rook', 'player', { row: 5, col: 0 });
    const friendly = createPiece('pawn', 'player', { row: 3, col: 0 });
    const moves = getLegalMoves(rook, [rook, friendly]);
    // Up: row 4 only (blocked at 3). Right: cols 1-5. Down: nothing. Left: nothing.
    expect(hasTarget(moves, 4, 0)).toBe(true);
    expect(hasTarget(moves, 3, 0)).toBe(false);
    expect(hasTarget(moves, 2, 0)).toBe(false);
  });

  it('can capture enemy and stops', () => {
    const rook = createPiece('rook', 'player', { row: 5, col: 0 });
    const enemy = createPiece('pawn', 'enemy', { row: 3, col: 0 });
    const moves = getLegalMoves(rook, [rook, enemy]);
    expect(hasTarget(moves, 3, 0)).toBe(true);
    expect(captureTargets(moves)).toContain('3,0');
    // Cannot pass through enemy
    expect(hasTarget(moves, 2, 0)).toBe(false);
  });

  it('does not move diagonally', () => {
    const rook = createPiece('rook', 'player', { row: 3, col: 3 });
    const moves = getLegalMoves(rook, [rook]);
    expect(hasTarget(moves, 2, 2)).toBe(false);
    expect(hasTarget(moves, 4, 4)).toBe(false);
  });
});

// ─── Bishop ──────────────────────────────────────────────

describe('bishop movement', () => {
  it('slides diagonally', () => {
    const bishop = createPiece('bishop', 'player', { row: 3, col: 3 });
    const moves = getLegalMoves(bishop, [bishop]);
    expect(hasTarget(moves, 2, 2)).toBe(true);
    expect(hasTarget(moves, 4, 4)).toBe(true);
    expect(hasTarget(moves, 2, 4)).toBe(true);
    expect(hasTarget(moves, 4, 2)).toBe(true);
  });

  it('does not move orthogonally', () => {
    const bishop = createPiece('bishop', 'player', { row: 3, col: 3 });
    const moves = getLegalMoves(bishop, [bishop]);
    expect(hasTarget(moves, 3, 4)).toBe(false);
    expect(hasTarget(moves, 2, 3)).toBe(false);
  });

  it('is blocked by friendly piece on diagonal', () => {
    const bishop = createPiece('bishop', 'player', { row: 5, col: 0 });
    const friendly = createPiece('pawn', 'player', { row: 3, col: 2 });
    const moves = getLegalMoves(bishop, [bishop, friendly]);
    expect(hasTarget(moves, 4, 1)).toBe(true);
    expect(hasTarget(moves, 3, 2)).toBe(false);
    expect(hasTarget(moves, 2, 3)).toBe(false);
  });
});

// ─── Queen ───────────────────────────────────────────────

describe('queen movement', () => {
  it('slides in all 8 directions', () => {
    const queen = createPiece('queen', 'player', { row: 3, col: 3 });
    const moves = getLegalMoves(queen, [queen]);
    // Orthogonal: 10, diagonal squares from center of 6x6
    expect(hasTarget(moves, 0, 3)).toBe(true); // up
    expect(hasTarget(moves, 5, 3)).toBe(true); // down
    expect(hasTarget(moves, 3, 0)).toBe(true); // left
    expect(hasTarget(moves, 3, 5)).toBe(true); // right
    expect(hasTarget(moves, 0, 0)).toBe(true); // up-left
    expect(hasTarget(moves, 5, 5)).toBe(true); // down-right
    expect(hasTarget(moves, 1, 5)).toBe(true); // up-right
    expect(hasTarget(moves, 5, 1)).toBe(true); // down-left
  });
});

// ─── King ────────────────────────────────────────────────

describe('king movement', () => {
  it('moves 1 square in all directions', () => {
    const king = createPiece('king', 'player', { row: 3, col: 3 });
    const moves = getLegalMoves(king, [king]);
    expect(moves.length).toBe(8);
    // Should not reach 2 squares away
    expect(hasTarget(moves, 1, 3)).toBe(false);
  });

  it('is limited at corner', () => {
    const king = createPiece('king', 'player', { row: 0, col: 0 });
    const moves = getLegalMoves(king, [king]);
    expect(moves.length).toBe(3);
  });

  it('captures adjacent enemy', () => {
    const king = createPiece('king', 'player', { row: 3, col: 3 });
    const enemy = createPiece('pawn', 'enemy', { row: 2, col: 3 });
    const moves = getLegalMoves(king, [king, enemy]);
    expect(captureTargets(moves)).toContain('2,3');
  });
});

// ─── En Passant ──────────────────────────────────────────

describe('en passant', () => {
  it('player pawn can capture en passant after enemy double-step', () => {
    const pawn = createPiece('pawn', 'player', { row: 2, col: 2 });
    pawn.hasMoved = true;
    const enemyPawn = createPiece('pawn', 'enemy', { row: 2, col: 3 });
    enemyPawn.hasMoved = true;
    const eps: EnPassantInfo[] = [{ targetSquare: { row: 1, col: 3 }, capturedPieceId: enemyPawn.id }];

    const moves = getLegalMoves(pawn, [pawn, enemyPawn], eps);
    const epMove = moves.find(m => m.to.row === 1 && m.to.col === 3);
    expect(epMove).toBeDefined();
    expect(epMove!.capturedPieceId).toBe(enemyPawn.id);
    expect(epMove!.isEnPassant).toBe(true);
  });

  it('en passant not available without en passant info', () => {
    const pawn = createPiece('pawn', 'player', { row: 2, col: 2 });
    pawn.hasMoved = true;
    const enemyPawn = createPiece('pawn', 'enemy', { row: 2, col: 3 });
    enemyPawn.hasMoved = true;

    const moves = getLegalMoves(pawn, [pawn, enemyPawn], []);
    const epMove = moves.find(m => m.to.row === 1 && m.to.col === 3);
    expect(epMove).toBeUndefined();
  });

  it('en passant only works from adjacent column', () => {
    const pawn = createPiece('pawn', 'player', { row: 2, col: 0 });
    pawn.hasMoved = true;
    const enemyPawn = createPiece('pawn', 'enemy', { row: 2, col: 3 });
    enemyPawn.hasMoved = true;
    const eps: EnPassantInfo[] = [{ targetSquare: { row: 1, col: 3 }, capturedPieceId: enemyPawn.id }];

    const moves = getLegalMoves(pawn, [pawn, enemyPawn], eps);
    const epMove = moves.find(m => m.to.row === 1 && m.to.col === 3);
    expect(epMove).toBeUndefined();
  });

  it('enemy pawn can capture en passant after player double-step', () => {
    const enemyPawn = createPiece('pawn', 'enemy', { row: 3, col: 2 });
    enemyPawn.hasMoved = true;
    const playerPawn = createPiece('pawn', 'player', { row: 3, col: 3 });
    playerPawn.hasMoved = true;
    const eps: EnPassantInfo[] = [{ targetSquare: { row: 4, col: 3 }, capturedPieceId: playerPawn.id }];

    const moves = getLegalMoves(enemyPawn, [enemyPawn, playerPawn], eps);
    const epMove = moves.find(m => m.to.row === 4 && m.to.col === 3);
    expect(epMove).toBeDefined();
    expect(epMove!.isEnPassant).toBe(true);
  });

  it('multiple en passant targets from multiple double-steps', () => {
    const pawn = createPiece('pawn', 'player', { row: 2, col: 2 });
    pawn.hasMoved = true;
    const enemyA = createPiece('pawn', 'enemy', { row: 2, col: 1 });
    enemyA.hasMoved = true;
    const enemyB = createPiece('pawn', 'enemy', { row: 2, col: 3 });
    enemyB.hasMoved = true;
    const eps: EnPassantInfo[] = [
      { targetSquare: { row: 1, col: 1 }, capturedPieceId: enemyA.id },
      { targetSquare: { row: 1, col: 3 }, capturedPieceId: enemyB.id },
    ];

    const moves = getLegalMoves(pawn, [pawn, enemyA, enemyB], eps);
    const epLeft = moves.find(m => m.to.row === 1 && m.to.col === 1);
    const epRight = moves.find(m => m.to.row === 1 && m.to.col === 3);
    expect(epLeft).toBeDefined();
    expect(epRight).toBeDefined();
    expect(epLeft!.capturedPieceId).toBe(enemyA.id);
    expect(epRight!.capturedPieceId).toBe(enemyB.id);
  });
});
