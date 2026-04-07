import { PieceType } from '../core/piece.js';
import { RngFn, pick } from '../utils/rng.js';

export type ShopItemKind =
  | { kind: 'piece'; pieceType: PieceType }
  | { kind: 'heal'; amount: number }
  | { kind: 'extra_move' }
  | { kind: 'army_slot' };

export interface ShopItem {
  type: ShopItemKind;
  name: string;
  description: string;
  cost: number;
}

const PIECE_POOL: { type: PieceType; name: string; cost: number }[] = [
  { type: 'pawn', name: 'Pawn', cost: 2 },
  { type: 'knight', name: 'Knight', cost: 5 },
  { type: 'bishop', name: 'Bishop', cost: 5 },
  { type: 'rook', name: 'Rook', cost: 7 },
  { type: 'queen', name: 'Queen', cost: 12 },
];

function makePieceItem(entry: { type: PieceType; name: string; cost: number }): ShopItem {
  return {
    type: { kind: 'piece', pieceType: entry.type },
    name: entry.name,
    description: `Add a ${entry.name} to your army`,
    cost: entry.cost,
  };
}

const HEAL_ITEM: ShopItem = {
  type: { kind: 'heal', amount: 1 },
  name: 'King Heal',
  description: 'Restore 1 HP to your king',
  cost: 4,
};

const EXTRA_MOVE_ITEM: ShopItem = {
  type: { kind: 'extra_move' },
  name: 'Extra Move',
  description: '+1 move per turn (permanent)',
  cost: 10,
};

const ARMY_SLOT_ITEM: ShopItem = {
  type: { kind: 'army_slot' },
  name: 'Army Slot',
  description: '+1 army slot (max 9)',
  cost: 6,
};

export function generateShopItems(rng: RngFn, armySlots: number): ShopItem[] {
  const items: ShopItem[] = [];

  // Always offer a random piece
  const piece = pick(PIECE_POOL, rng);
  if (piece) items.push(makePieceItem(piece));

  // Second item: another piece, heal, or army slot
  const roll2 = rng();
  if (roll2 < 0.35) {
    const piece2 = pick(PIECE_POOL, rng);
    if (piece2) items.push(makePieceItem(piece2));
  } else if (roll2 < 0.7) {
    items.push({ ...HEAL_ITEM });
  } else if (armySlots < MAX_ARMY_SLOTS) {
    items.push({ ...ARMY_SLOT_ITEM });
  } else {
    items.push({ ...HEAL_ITEM });
  }

  // Third item: heal, extra move, army slot, or piece
  const roll3 = rng();
  if (roll3 < 0.25) {
    items.push({ ...EXTRA_MOVE_ITEM });
  } else if (roll3 < 0.5) {
    items.push({ ...HEAL_ITEM });
  } else if (roll3 < 0.65 && armySlots < MAX_ARMY_SLOTS) {
    items.push({ ...ARMY_SLOT_ITEM });
  } else {
    const piece3 = pick(PIECE_POOL, rng);
    if (piece3) items.push(makePieceItem(piece3));
  }

  return items;
}

export const DEFAULT_ARMY_SLOTS = 6;
export const MAX_ARMY_SLOTS = 9;
