import { PieceType } from '../core/piece.js';
import { ArtifactDef } from '../core/artifact.js';
import { ModifierDef } from '../core/modifier.js';
import { ALL_ARTIFACTS, ARTIFACT_UPGRADES, ArtifactUpgrade } from '../data/artifacts.js';
import { ALL_MODIFIERS } from '../data/modifiers.js';
import { RngFn, pick } from '../utils/rng.js';

export type ShopItemKind =
  | { kind: 'piece'; pieceType: PieceType }
  | { kind: 'heal'; amount: number }
  | { kind: 'extra_move' }
  | { kind: 'army_slot' }
  | { kind: 'artifact'; artifact: ArtifactDef }
  | { kind: 'modifier'; modifier: ModifierDef }
  | { kind: 'artifact_upgrade'; upgrade: ArtifactUpgrade };

export interface ShopItem {
  type: ShopItemKind;
  name: string;
  description: string;
  cost: number;
  rarity?: string;
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

const ARTIFACT_COSTS: Record<string, number> = {
  common: 3,
  uncommon: 6,
  rare: 9,
  legendary: 13,
};

function makeArtifactItem(def: ArtifactDef): ShopItem {
  return {
    type: { kind: 'artifact', artifact: def },
    name: def.name,
    description: def.description,
    cost: ARTIFACT_COSTS[def.rarity] ?? 5,
    rarity: def.rarity,
  };
}

function makeModifierItem(def: ModifierDef): ShopItem {
  return {
    type: { kind: 'modifier', modifier: def },
    name: `${capitalize(def.pieceType)}: ${def.name}`,
    description: def.description,
    cost: def.cost,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const HEAL_ITEM: ShopItem = {
  type: { kind: 'heal', amount: 1 },
  name: 'King Heal',
  description: 'Restore 1 HP to your king',
  cost: 4,
};

const ARMY_SLOT_ITEM: ShopItem = {
  type: { kind: 'army_slot' },
  name: 'Army Slot',
  description: '+1 army slot (max 9)',
  cost: 6,
};

function pickArtifact(rng: RngFn, ownedIds: ReadonlySet<string>): ShopItem | null {
  const available = ALL_ARTIFACTS.filter(a => !ownedIds.has(a.id) && !a.isStarter);
  if (available.length === 0) return null;

  // Weight by rarity: common more likely
  const weights: Record<string, number> = { common: 4, uncommon: 3, rare: 2, legendary: 1 };
  const weighted: ArtifactDef[] = [];
  for (const a of available) {
    const w = weights[a.rarity] ?? 1;
    for (let i = 0; i < w; i++) weighted.push(a);
  }
  const chosen = pick(weighted, rng);
  return chosen ? makeArtifactItem(chosen) : null;
}

function pickArtifactUpgrade(rng: RngFn, ownedArtifactIds: ReadonlySet<string>): ShopItem | null {
  const available = ARTIFACT_UPGRADES.filter(u =>
    ownedArtifactIds.has(u.baseArtifactId) && !ownedArtifactIds.has(u.upgraded.id)
  );
  if (available.length === 0) return null;
  const chosen = pick(available, rng);
  if (!chosen) return null;
  return {
    type: { kind: 'artifact_upgrade', upgrade: chosen },
    name: '\u2B06 ' + chosen.upgraded.name,
    description: chosen.upgraded.description,
    cost: chosen.cost,
    rarity: chosen.upgraded.rarity,
  };
}

function pickModifierForArmy(rng: RngFn, ownedPieceTypes: ReadonlySet<PieceType>): ShopItem | null {
  const available = ALL_MODIFIERS.filter(m => ownedPieceTypes.has(m.pieceType));
  if (available.length === 0) return null;
  const mod = pick(available, rng);
  return mod ? makeModifierItem(mod) : null;
}

function randomPieceItem(rng: RngFn): ShopItem | null {
  const piece = pick(PIECE_POOL, rng);
  return piece ? makePieceItem(piece) : null;
}

function pickWithPieceFallback(primary: ShopItem | null, rng: RngFn): ShopItem | null {
  return primary ?? randomPieceItem(rng);
}

export function generateShopItems(
  rng: RngFn,
  armySlots: number,
  ownedArtifactIds: ReadonlySet<string>,
  ownedPieceTypes: ReadonlySet<PieceType>,
): ShopItem[] {
  const items: ShopItem[] = [];

  // Slot 1: piece or modifier
  if (rng() < 0.6) {
    const item = randomPieceItem(rng);
    if (item) items.push(item);
  } else {
    const item = pickWithPieceFallback(pickModifierForArmy(rng, ownedPieceTypes), rng);
    if (item) items.push(item);
  }

  // Slot 2: artifact upgrade, artifact, heal, or army slot
  const roll2 = rng();
  if (roll2 < 0.4) {
    const upgrade = pickArtifactUpgrade(rng, ownedArtifactIds);
    if (upgrade) {
      items.push(upgrade);
    } else {
      const art = pickArtifact(rng, ownedArtifactIds);
      items.push(art ?? { ...HEAL_ITEM });
    }
  } else if (roll2 < 0.7) {
    items.push({ ...HEAL_ITEM });
  } else if (armySlots < MAX_ARMY_SLOTS) {
    items.push({ ...ARMY_SLOT_ITEM });
  } else {
    items.push({ ...HEAL_ITEM });
  }

  // Slot 3: piece, modifier, or artifact
  const roll3 = rng();
  if (roll3 < 0.3) {
    const item = randomPieceItem(rng);
    if (item) items.push(item);
  } else if (roll3 < 0.6) {
    const item = pickWithPieceFallback(pickModifierForArmy(rng, ownedPieceTypes), rng);
    if (item) items.push(item);
  } else {
    const item = pickWithPieceFallback(pickArtifact(rng, ownedArtifactIds), rng);
    if (item) items.push(item);
  }

  return items;
}

export function generateReplacementItem(
  rng: RngFn,
  armySlots: number,
  ownedArtifactIds: ReadonlySet<string>,
  ownedPieceTypes: ReadonlySet<PieceType>,
): ShopItem {
  const roll = rng();
  if (roll < 0.35) {
    const item = randomPieceItem(rng);
    if (item) return item;
  } else if (roll < 0.6) {
    const mod = pickModifierForArmy(rng, ownedPieceTypes);
    if (mod) return mod;
  } else if (roll < 0.8) {
    const art = pickArtifact(rng, ownedArtifactIds);
    if (art) return art;
  }
  // Fallback: random piece or heal
  return randomPieceItem(rng) ?? { ...HEAL_ITEM };
}

export const DEFAULT_ARMY_SLOTS = 6;
export const MAX_ARMY_SLOTS = 9;
