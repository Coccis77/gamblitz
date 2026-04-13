import { RngFn, pick } from '../utils/rng.js';
import { PieceType } from '../core/piece.js';

export type LevelType = 'normal' | 'elite' | 'boss';

/** Each rank consists of: normal → normal → elite → boss */
const RANK_PATTERN: LevelType[] = ['normal', 'normal', 'elite', 'boss'];

export type Mutation =
  | { kind: 'enemy_extra_move'; description: string }
  | { kind: 'player_fewer_moves'; description: string }
  | { kind: 'fog_of_war'; description: string }
  | { kind: 'armored_enemies'; description: string };

const MUTATION_POOL: Mutation[] = [
  { kind: 'enemy_extra_move', description: 'Enemies act twice per turn' },
  { kind: 'player_fewer_moves', description: 'You have 1 fewer move per turn' },
  { kind: 'fog_of_war', description: 'Enemy intents are hidden' },
  { kind: 'armored_enemies', description: 'Enemies take 2 hits to capture' },
];

export interface RunState {
  seed: number;
  rank: number;
  levelInRank: number;
  totalLevelsCleared: number;
  totalCaptures: number;
  totalGoldEarned: number;
  mutations: Mutation[];
  bountyCaptures: number; // remaining bounty captures from events
  bountyGold: number;     // gold per bounty capture
}

export function createRunState(seed: number): RunState {
  return {
    seed,
    rank: 1,
    levelInRank: 0,
    totalLevelsCleared: 0,
    totalCaptures: 0,
    totalGoldEarned: 0,
    mutations: [],
    bountyCaptures: 0,
    bountyGold: 0,
  };
}

export function getCurrentLevelType(run: RunState): LevelType {
  return RANK_PATTERN[run.levelInRank] ?? 'normal';
}

export function advanceRun(run: RunState, rng: RngFn): void {
  run.totalLevelsCleared++;
  run.levelInRank++;
  if (run.levelInRank >= RANK_PATTERN.length) {
    run.levelInRank = 0;
    run.rank++;

    // Roll for mutation every rank after rank 2
    if (run.rank >= 3) {
      const mutation = pick(MUTATION_POOL, rng);
      if (mutation && !run.mutations.some(m => m.kind === mutation.kind)) {
        run.mutations.push(mutation);
      }
    }
  }
}

export function hasMutation(run: RunState, kind: Mutation['kind']): boolean {
  return run.mutations.some(m => m.kind === kind);
}

/**
 * Difficulty multiplier based on rank.
 * Affects enemy count, enemy piece quality, boss HP, etc.
 */
export function getDifficultyScale(rank: number): {
  extraEnemies: number;
  bossHP: number;
  enemyUpgradeChance: number;
  pawnToKnightChance: number;
  pawnToBishopChance: number;
  pawnToRookChance: number;
  extraPieceTypes: PieceType[];
} {
  return {
    extraEnemies: Math.min(rank - 1, 6),
    bossHP: 2 + rank,
    enemyUpgradeChance: Math.min(0.15 * (rank - 1), 0.6),
    pawnToKnightChance: Math.min(0.1 * rank, 0.4),
    pawnToBishopChance: Math.min(0.08 * rank, 0.3),
    pawnToRookChance: rank >= 3 ? Math.min(0.05 * (rank - 2), 0.2) : 0,
    extraPieceTypes: rank >= 4 ? ['knight', 'bishop'] : ['pawn'],
  };
}
