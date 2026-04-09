import { Piece } from '../core/piece.js';

export interface PromotionRecord {
  pieceId: string;
  originalType: 'pawn';
  savedModifiers: Piece['modifiers'];
}

/**
 * Check for player pawns that reached enemy back rank (row 0).
 * Promotes them to queen temporarily. Returns records to revert later.
 */
export function checkPlayerPawnPromotion(pieces: Piece[]): PromotionRecord[] {
  const records: PromotionRecord[] = [];

  for (const p of pieces) {
    if (p.owner === 'player' && p.type === 'pawn' && p.position.row === 0) {
      records.push({
        pieceId: p.id,
        originalType: 'pawn',
        savedModifiers: [...p.modifiers],
      });
      p.type = 'queen';
      p.modifiers = []; // modifiers lost on promotion
    }
  }

  return records;
}

/** Revert promoted pieces back to pawns at end of level. */
export function revertPromotions(pieces: Piece[], records: PromotionRecord[]): void {
  for (const rec of records) {
    const piece = pieces.find(p => p.id === rec.pieceId);
    if (piece) {
      piece.type = rec.originalType;
      piece.modifiers = rec.savedModifiers;
    }
  }
}
