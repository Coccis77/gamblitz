export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#ccc',
  uncommon: '#4a9fd9',
  rare: '#a855f7',
  legendary: '#f0c040',
};

export type ArtifactEffect =
  | { kind: 'gold_per_capture'; amount: number }
  | { kind: 'gold_per_level'; amount: number }
  | { kind: 'extra_move'; amount: number }
  | { kind: 'king_max_hp'; amount: number }
  | { kind: 'pawn_capture_backward' }
  | { kind: 'knight_extended_range' }
  | { kind: 'bishop_orthogonal_step' }
  | { kind: 'rook_diagonal_step' }
  | { kind: 'king_extra_hp_on_hit'; chance: number }
  | { kind: 'capture_heals'; chance: number }
  | { kind: 'extra_slot' }
  | { kind: 'pawn_double_step_always' };

export interface ArtifactDef {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  effect: ArtifactEffect;
}

export interface ArtifactSlots {
  maxSlots: number;
  artifacts: ArtifactDef[];
}

export function createArtifactSlots(): ArtifactSlots {
  return { maxSlots: 4, artifacts: [] };
}

export function canAddArtifact(slots: ArtifactSlots): boolean {
  return slots.artifacts.length < slots.maxSlots;
}

export function addArtifact(slots: ArtifactSlots, artifact: ArtifactDef): boolean {
  if (!canAddArtifact(slots)) return false;
  slots.artifacts.push(artifact);
  return true;
}

export function removeArtifact(slots: ArtifactSlots, index: number): ArtifactDef | null {
  if (index < 0 || index >= slots.artifacts.length) return null;
  return slots.artifacts.splice(index, 1)[0] ?? null;
}

export function hasArtifactEffect(slots: ArtifactSlots, kind: ArtifactEffect['kind']): boolean {
  return slots.artifacts.some(a => a.effect.kind === kind);
}

export function getArtifactEffectValue(slots: ArtifactSlots, kind: 'gold_per_capture' | 'gold_per_level' | 'extra_move' | 'king_max_hp'): number {
  let total = 0;
  for (const a of slots.artifacts) {
    if (a.effect.kind === kind && 'amount' in a.effect) {
      total += a.effect.amount;
    }
  }
  return total;
}
