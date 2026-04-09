import { ArtifactDef } from '../core/artifact.js';

export const ALL_ARTIFACTS: ArtifactDef[] = [
  // ─── Common ────────────────────────────────────
  {
    id: 'gold_tooth',
    name: 'Gold Tooth',
    description: '+1 gold per capture',
    rarity: 'common',
    effect: { kind: 'gold_per_capture', amount: 1 },
  },
  {
    id: 'war_chest',
    name: 'War Chest',
    description: '+3 gold per level completed',
    rarity: 'common',
    effect: { kind: 'gold_per_level', amount: 3 },
  },
  {
    id: 'iron_boots',
    name: 'Iron Boots',
    description: 'Pawns can always double-step',
    rarity: 'common',
    effect: { kind: 'pawn_double_step_always' },
  },
  {
    id: 'lucky_coin',
    name: 'Lucky Coin',
    description: '25% chance to heal on capture',
    rarity: 'common',
    effect: { kind: 'capture_heals', chance: 0.25 },
  },

  // ─── Uncommon ──────────────────────────────────
  {
    id: 'swift_command',
    name: 'Swift Command',
    description: '+1 move per turn',
    rarity: 'uncommon',
    effect: { kind: 'extra_move', amount: 1 },
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
];
