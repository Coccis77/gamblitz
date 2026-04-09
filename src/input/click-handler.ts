import { Position } from '../utils/types.js';
import { positionEquals } from '../core/board.js';
import { Piece } from '../core/piece.js';
import { Move, getLegalMoves, EnPassantInfo } from '../core/movement.js';

export interface SelectionState {
  selectedPiece: Piece | null;
  legalMoves: Move[];
}

export function createSelectionState(): SelectionState {
  return { selectedPiece: null, legalMoves: [] };
}

/**
 * Handle a click on the board. Returns the move to execute, or null if
 * the click was just a selection/deselection.
 */
export function handleBoardClick(
  pos: Position,
  pieces: readonly Piece[],
  selection: SelectionState,
  enPassants: readonly EnPassantInfo[],
): Move | null {
  // If a piece is selected and we click a legal move target — return the move
  if (selection.selectedPiece) {
    const move = selection.legalMoves.find(m => positionEquals(m.to, pos));
    if (move) {
      clearSelection(selection);
      return move;
    }
  }

  // Try to select a player piece at the clicked position
  const clickedPiece = pieces.find(
    p => p.owner === 'player' && positionEquals(p.position, pos),
  );

  if (clickedPiece) {
    if (selection.selectedPiece?.id === clickedPiece.id) {
      clearSelection(selection);
    } else {
      selection.selectedPiece = clickedPiece;
      selection.legalMoves = getLegalMoves(clickedPiece, pieces, enPassants);
    }
  } else {
    clearSelection(selection);
  }

  return null;
}

export function executeMove(move: Move, pieces: Piece[]): void {
  if (move.capturedPieceId) {
    const idx = pieces.findIndex(p => p.id === move.capturedPieceId);
    if (idx !== -1) pieces.splice(idx, 1);
  }

  const piece = pieces.find(p => positionEquals(p.position, move.from));
  if (piece) {
    piece.position = { ...move.to };
    piece.hasMoved = true;
    if (move.capturedPieceId) piece.hasCapturedThisTurn = true;
  }
}

export function clearSelection(selection: SelectionState): void {
  selection.selectedPiece = null;
  selection.legalMoves = [];
}

export function computeEnPassant(move: Move, pieces: readonly Piece[]): EnPassantInfo | null {
  const piece = pieces.find(p => positionEquals(p.position, move.to));
  if (!piece || piece.type !== 'pawn') return null;

  const rowDiff = Math.abs(move.to.row - move.from.row);
  if (rowDiff !== 2) return null;

  const passedRow = (move.from.row + move.to.row) / 2;
  return {
    targetSquare: { row: passedRow, col: move.to.col },
    capturedPieceId: piece.id,
  };
}
