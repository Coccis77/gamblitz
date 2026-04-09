import { Position, BOARD_SIZE } from '../utils/types.js';
import { isInBounds, positionEquals } from './board.js';
import { Piece, PieceType } from './piece.js';

// --- Direction vectors ---

type Dir = [number, number]; // [rowDelta, colDelta]

const ORTHOGONAL: Dir[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL: Dir[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ALL_DIRS: Dir[] = [...ORTHOGONAL, ...DIAGONAL];
const KNIGHT_JUMPS: Dir[] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

// --- Movement ability system ---

export type AbilityType = 'slide' | 'jump' | 'step';

export type DirectionSet = 'orthogonal' | 'diagonal' | 'all' | 'knight' | 'forward' | 'forward-diagonal' | 'backward-diagonal';

export type AbilityCondition = 'first-move-only';

export interface MovementAbility {
  type: AbilityType;
  directions: DirectionSet;
  maxRange?: number;
  canCapture: boolean;
  canMoveWithoutCapture: boolean;
  condition?: AbilityCondition;
}

function resolveDirections(set: DirectionSet, owner: Piece['owner']): Dir[] {
  const forward = owner === 'player' ? -1 : 1;
  switch (set) {
    case 'orthogonal': return ORTHOGONAL;
    case 'diagonal': return DIAGONAL;
    case 'all': return ALL_DIRS;
    case 'knight': return KNIGHT_JUMPS;
    case 'forward': return [[forward, 0]];
    case 'forward-diagonal': return [[forward, -1], [forward, 1]];
    case 'backward-diagonal': return [[-forward, -1], [-forward, 1]];
  }
}

// --- Default abilities per piece type ---

const DEFAULT_ABILITIES: Record<PieceType, MovementAbility[]> = {
  king: [
    { type: 'step', directions: 'all', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  ],
  queen: [
    { type: 'slide', directions: 'all', canCapture: true, canMoveWithoutCapture: true },
  ],
  rook: [
    { type: 'slide', directions: 'orthogonal', canCapture: true, canMoveWithoutCapture: true },
  ],
  bishop: [
    { type: 'slide', directions: 'diagonal', canCapture: true, canMoveWithoutCapture: true },
  ],
  knight: [
    { type: 'jump', directions: 'knight', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
  ],
  pawn: [
    { type: 'step', directions: 'forward', maxRange: 1, canCapture: false, canMoveWithoutCapture: true },
    { type: 'slide', directions: 'forward', maxRange: 2, canCapture: false, canMoveWithoutCapture: true, condition: 'first-move-only' },
    { type: 'step', directions: 'forward-diagonal', maxRange: 1, canCapture: true, canMoveWithoutCapture: false },
  ],
};

export function getAbilities(piece: Piece): MovementAbility[] {
  const base = DEFAULT_ABILITIES[piece.type];
  if (piece.modifiers.length === 0) return base;
  return [...base, ...piece.modifiers.map(m => m.ability)];
}

// --- Legal move computation ---

export interface EnPassantInfo {
  targetSquare: Position;
  capturedPieceId: string;
}

export interface Move {
  from: Position;
  to: Position;
  capturedPieceId: string | null;
  isEnPassant?: boolean;
}

function meetsCondition(piece: Piece, condition: AbilityCondition | undefined): boolean {
  if (!condition) return true;
  switch (condition) {
    case 'first-move-only': return !piece.hasMoved;
  }
}

export function getLegalMoves(
  piece: Piece,
  allPieces: readonly Piece[],
  enPassants?: readonly EnPassantInfo[],
): Move[] {
  const abilities = getAbilities(piece);
  const moves: Move[] = [];

  for (const ability of abilities) {
    if (!meetsCondition(piece, ability.condition)) continue;
    const dirs = resolveDirections(ability.directions, piece.owner);
    switch (ability.type) {
      case 'slide':
        addSlideMoves(piece, dirs, ability, allPieces, moves);
        break;
      case 'jump':
        addJumpMoves(piece, dirs, ability, allPieces, moves);
        break;
      case 'step':
        addStepMoves(piece, dirs, ability, allPieces, moves);
        break;
    }
  }

  // En passant
  if (piece.type === 'pawn' && enPassants) {
    const forward = piece.owner === 'player' ? -1 : 1;
    for (const ep of enPassants) {
      const epRow = piece.position.row + forward;
      if (
        epRow === ep.targetSquare.row &&
        Math.abs(piece.position.col - ep.targetSquare.col) === 1
      ) {
        moves.push({
          from: piece.position,
          to: ep.targetSquare,
          capturedPieceId: ep.capturedPieceId,
          isEnPassant: true,
        });
      }
    }
  }

  // Player pieces that captured this turn cannot move again
  if (piece.owner === 'player' && piece.hasCapturedThisTurn) {
    return [];
  }

  return moves;
}

function pieceAt(pos: Position, allPieces: readonly Piece[]): Piece | undefined {
  return allPieces.find(p => positionEquals(p.position, pos));
}

function tryAddMove(
  piece: Piece,
  target: Position,
  ability: MovementAbility,
  allPieces: readonly Piece[],
  moves: Move[],
): 'empty' | 'capture' | 'blocked' | 'skip' {
  const occupant = pieceAt(target, allPieces);

  if (occupant) {
    if (occupant.owner === piece.owner) return 'blocked';
    // Enemy occupant — capture
    if (ability.canCapture) {
      moves.push({ from: piece.position, to: target, capturedPieceId: occupant.id });
      return 'capture';
    }
    return 'blocked';
  }

  // Empty square
  if (ability.canMoveWithoutCapture) {
    moves.push({ from: piece.position, to: target, capturedPieceId: null });
    return 'empty';
  }
  return 'skip';
}

function addSlideMoves(
  piece: Piece,
  dirs: Dir[],
  ability: MovementAbility,
  allPieces: readonly Piece[],
  moves: Move[],
): void {
  for (const [dr, dc] of dirs) {
    const maxRange = ability.maxRange ?? BOARD_SIZE;
    for (let dist = 1; dist <= maxRange; dist++) {
      const target: Position = { row: piece.position.row + dr * dist, col: piece.position.col + dc * dist };
      if (!isInBounds(target)) break;
      const result = tryAddMove(piece, target, ability, allPieces, moves);
      if (result === 'blocked' || result === 'capture') break; // slides stop on occupant
    }
  }
}

function addJumpMoves(
  piece: Piece,
  dirs: Dir[],
  ability: MovementAbility,
  allPieces: readonly Piece[],
  moves: Move[],
): void {
  for (const [dr, dc] of dirs) {
    const target: Position = { row: piece.position.row + dr, col: piece.position.col + dc };
    if (!isInBounds(target)) continue;
    tryAddMove(piece, target, ability, allPieces, moves);
  }
}

function addStepMoves(
  piece: Piece,
  dirs: Dir[],
  ability: MovementAbility,
  allPieces: readonly Piece[],
  moves: Move[],
): void {
  const maxRange = ability.maxRange ?? 1;
  for (const [dr, dc] of dirs) {
    for (let dist = 1; dist <= maxRange; dist++) {
      const target: Position = { row: piece.position.row + dr * dist, col: piece.position.col + dc * dist };
      if (!isInBounds(target)) break;
      const result = tryAddMove(piece, target, ability, allPieces, moves);
      if (result !== 'skip') break; // step stops after first square it can interact with
    }
  }
}
