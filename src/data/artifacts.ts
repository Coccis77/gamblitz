import { ArtifactDef } from '../core/artifact.js';

export const ALL_ARTIFACTS: ArtifactDef[] = [
  // ─── Common ────────────────────────────────────
  {
    id: 'gold_tooth',
    name: 'Gold Tooth',
    description: '+1 gold per capture',
    rarity: 'common',
    effect: { kind: 'gold_per_capture', amount: 1 },
    isStarter: true,
  },
  {
    id: 'war_chest',
    name: 'War Chest',
    description: '+3 gold per level completed',
    rarity: 'common',
    effect: { kind: 'gold_per_level', amount: 3 },
    isStarter: true,
  },
  {
    id: 'iron_boots',
    name: 'Iron Boots',
    description: 'Pawns can move 2 forward every turn',
    rarity: 'common',
    effect: { kind: 'pawn_double_step_always' },
    isStarter: true,
  },
  {
    id: 'lucky_coin',
    name: 'Lucky Coin',
    description: '25% chance to heal on capture',
    rarity: 'common',
    effect: { kind: 'capture_heals', chance: 0.25 },
    isStarter: true,
  },
  {
    id: 'merchants_eye',
    name: "Merchant's Eye",
    description: '+2 gold per level completed',
    rarity: 'common',
    effect: { kind: 'gold_per_level', amount: 2 },
  },

  // ─── Uncommon ──────────────────────────────────
  {
    id: 'swift_command',
    name: 'Swift Command',
    description: '+1 move per turn',
    rarity: 'uncommon',
    effect: { kind: 'extra_move', amount: 1 },
    isStarter: true,
  },
  {
    id: 'bishops_compass',
    name: "Bishop's Compass",
    description: 'Bishops can step 1 square orthogonally',
    rarity: 'uncommon',
    effect: { kind: 'bishop_orthogonal_step' },
  },
  {
    id: 'rooks_diagonal',
    name: "Rook's Angle",
    description: 'Rooks can step 1 square diagonally',
    rarity: 'uncommon',
    effect: { kind: 'rook_diagonal_step' },
  },
  {
    id: 'retreat_pawn',
    name: 'Tactical Retreat',
    description: 'Pawns can capture backward diagonally',
    rarity: 'uncommon',
    effect: { kind: 'pawn_capture_backward' },
    isStarter: true,
  },
  {
    id: 'bounty_hunter',
    name: 'Bounty Hunter',
    description: '+2 gold per capture',
    rarity: 'uncommon',
    effect: { kind: 'gold_per_capture', amount: 2 },
  },

  // ─── Rare ──────────────────────────────────────
  {
    id: 'royal_armor',
    name: 'Royal Armor',
    description: '+1 max king HP',
    rarity: 'rare',
    effect: { kind: 'king_max_hp', amount: 1 },
  },
  {
    id: 'horse_frenzy',
    name: 'Horse Frenzy',
    description: 'Knights gain extended L-range jumps',
    rarity: 'rare',
    effect: { kind: 'knight_extended_range' },
  },
  {
    id: 'second_wind',
    name: 'Second Wind',
    description: '30% chance king ignores a hit',
    rarity: 'rare',
    effect: { kind: 'king_extra_hp_on_hit', chance: 0.3 },
  },
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    description: '40% chance to heal on capture',
    rarity: 'rare',
    effect: { kind: 'capture_heals', chance: 0.4 },
  },

  // ─── Legendary ─────────────────────────────────
  {
    id: 'generals_badge',
    name: "General's Badge",
    description: '+1 artifact slot',
    rarity: 'legendary',
    effect: { kind: 'extra_slot' },
  },
  {
    id: 'double_time',
    name: 'Double Time',
    description: '+2 moves per turn',
    rarity: 'legendary',
    effect: { kind: 'extra_move', amount: 2 },
  },
  {
    id: 'war_banner',
    name: 'War Banner',
    description: '+1 extra move per turn',
    rarity: 'legendary',
    effect: { kind: 'extra_move', amount: 1 },
  },
];

export interface ArtifactUpgrade {
  baseArtifactId: string;
  upgraded: ArtifactDef;
  cost: number;
}

export const ARTIFACT_UPGRADES: ArtifactUpgrade[] = [
  {
    baseArtifactId: 'gold_tooth',
    upgraded: { id: 'gold_tooth_v2', name: 'Golden Fang', description: '+3 gold per capture', rarity: 'uncommon', effect: { kind: 'gold_per_capture', amount: 3 } },
    cost: 8,
  },
  {
    baseArtifactId: 'war_chest',
    upgraded: { id: 'war_chest_v2', name: 'Royal Treasury', description: '+6 gold per level', rarity: 'uncommon', effect: { kind: 'gold_per_level', amount: 6 } },
    cost: 8,
  },
  {
    baseArtifactId: 'iron_boots',
    upgraded: { id: 'iron_boots_v2', name: 'Winged Boots', description: 'Pawns move 2 forward every turn + capture backward', rarity: 'rare', effect: { kind: 'pawn_double_step_always' } },
    cost: 12,
  },
  {
    baseArtifactId: 'swift_command',
    upgraded: { id: 'swift_command_v2', name: 'Lightning Reflexes', description: '+2 moves per turn', rarity: 'rare', effect: { kind: 'extra_move', amount: 2 } },
    cost: 12,
  },
  {
    baseArtifactId: 'lucky_coin',
    upgraded: { id: 'lucky_coin_v2', name: 'Lucky Charm', description: '50% chance to heal on capture', rarity: 'rare', effect: { kind: 'capture_heals', chance: 0.5 } },
    cost: 8,
  },
  {
    baseArtifactId: 'retreat_pawn',
    upgraded: { id: 'retreat_pawn_v2', name: 'Full Retreat', description: 'Pawns capture in all diagonal directions', rarity: 'rare', effect: { kind: 'pawn_capture_backward' } },
    cost: 10,
  },
];
