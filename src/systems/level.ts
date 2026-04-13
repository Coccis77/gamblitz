import { Piece, createPiece, PieceType } from '../core/piece.js';
import { Objective, ObjectiveProgress, createObjective, createObjectiveProgress, isObjectiveComplete } from '../core/objective.js';
import { GameState, createGameState } from '../core/game.js';
import { LevelTemplate, NORMAL_TEMPLATES, ELITE_TEMPLATES, BOSS_TEMPLATES } from '../data/templates.js';
import { KingHP, createKingHP } from './king-hp.js';
import { ArtifactSlots, createArtifactSlots, getArtifactEffectValue, hasArtifactEffect } from '../core/artifact.js';
import { computeAllIntents } from '../ai/intent.js';
import { BOARD_SIZE } from '../utils/types.js';
import { DEFAULT_ARMY_SLOTS } from './shop.js';
import { RunState, LevelType, getCurrentLevelType, getDifficultyScale } from './run.js';
import { RngFn, pick } from '../utils/rng.js';

export interface LevelState {
  levelNumber: number;
  template: LevelTemplate;
  objective: Objective;
  progress: ObjectiveProgress;
  playerArmy: Piece[];
  playerKingHP: KingHP;
  enemyKingHP: KingHP | null;
  armySlots: number;
  artifactSlots: ArtifactSlots;
  completed: boolean;
  gameOver: boolean;
  victory: boolean;
  extraMoves?: number;
}

const PIECE_POWER: Record<PieceType, number> = {
  king: 0, // king is free — always included
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
};

const BUYABLE_TYPES: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];

function createPlayerArmy(rng: RngFn): Piece[] {
  const TARGET_POWER = 14;
  const TARGET_COUNT = 4; // 4 non-king pieces

  // Generate a random army that fits the power budget
  const chosen: PieceType[] = [];
  let power = 0;

  for (let i = 0; i < TARGET_COUNT; i++) {
    const remaining = TARGET_POWER - power;
    const slotsLeft = TARGET_COUNT - i;
    const maxPerSlot = remaining - (slotsLeft - 1); // leave at least 1 per remaining slot
    const affordable = BUYABLE_TYPES.filter(t => PIECE_POWER[t] <= maxPerSlot);
    if (affordable.length === 0) break;
    const picked = pick(affordable, rng);
    if (!picked) break;
    chosen.push(picked);
    power += PIECE_POWER[picked];
  }

  // Fill remaining budget with pawns
  while (power < TARGET_POWER && chosen.length < TARGET_COUNT) {
    chosen.push('pawn');
    power += 1;
  }

  // Place pieces: non-pawns on row 5, pawns on row 4
  const army: Piece[] = [];
  army.push(createPiece('king', 'player', { row: 5, col: 2 }));

  const nonPawns = chosen.filter(t => t !== 'pawn');
  const pawns = chosen.filter(t => t === 'pawn');

  // Shuffle column positions
  const row5Cols = [0, 1, 3, 4, 5].sort(() => rng() - 0.5);
  const row4Cols = [0, 1, 2, 3, 4, 5].sort(() => rng() - 0.5);

  let colIdx = 0;
  for (const type of nonPawns) {
    if (colIdx < row5Cols.length) {
      army.push(createPiece(type, 'player', { row: 5, col: row5Cols[colIdx]! }));
      colIdx++;
    }
  }

  let pawnColIdx = 0;
  for (const _ of pawns) {
    if (pawnColIdx < row4Cols.length) {
      army.push(createPiece('pawn', 'player', { row: 4, col: row4Cols[pawnColIdx]! }));
      pawnColIdx++;
    }
  }

  return army;
}

function pickTemplate(levelType: LevelType, rng: RngFn): LevelTemplate {
  const pool = levelType === 'boss' ? BOSS_TEMPLATES
    : levelType === 'elite' ? ELITE_TEMPLATES
    : NORMAL_TEMPLATES;
  return pick(pool, rng) ?? pool[0]!;
}

function spawnEnemies(template: LevelTemplate, rank: number, rng: RngFn): Piece[] {
  const base = template.enemies.map(e => createPiece(e.type, 'enemy', e.position));
  const scale = getDifficultyScale(rank);

  // Upgrade some pawns to stronger pieces based on rank
  for (const piece of base) {
    if (piece.type === 'pawn') {
      const roll = rng();
      if (roll < scale.pawnToRookChance) {
        piece.type = 'rook';
      } else if (roll < scale.pawnToRookChance + scale.pawnToBishopChance) {
        piece.type = 'bishop';
      } else if (roll < scale.pawnToRookChance + scale.pawnToBishopChance + scale.pawnToKnightChance) {
        piece.type = 'knight';
      }
    }
  }

  // Add extra enemies for higher ranks
  const occupied = new Set(base.map(p => `${p.position.row},${p.position.col}`));
  let added = 0;
  for (let col = 0; col < BOARD_SIZE && added < scale.extraEnemies; col++) {
    for (let row = 1; row <= 2 && added < scale.extraEnemies; row++) {
      const key = `${row},${col}`;
      if (!occupied.has(key)) {
        const extraType = pick(scale.extraPieceTypes, rng) ?? 'pawn';
        base.push(createPiece(extraType, 'enemy', { row, col }));
        occupied.add(key);
        added++;
      }
    }
  }

  return base;
}

export interface PersistedRunState {
  playerKingHP?: KingHP;
  playerArmy?: Piece[];
  armySlots?: number;
  artifactSlots?: ArtifactSlots;
}

export function createLevel(
  run: RunState,
  rng: RngFn,
  persisted?: PersistedRunState,
): LevelState {
  const levelType = getCurrentLevelType(run);
  const template = pickTemplate(levelType, rng);

  // Boss HP scales with rank
  const scale = getDifficultyScale(run.rank);
  const isBoss = levelType === 'boss';
  const enemyKingHp = isBoss ? scale.bossHP : 0;

  // Override template objective HP for boss
  const objective = isBoss
    ? createObjective({ kind: 'defeat_king', hp: enemyKingHp })
    : createObjective(template.objective);

  const army = persisted?.playerArmy
    ? resetArmyPositions(persisted.playerArmy)
    : createPlayerArmy(rng);

  return {
    levelNumber: run.totalLevelsCleared + 1,
    template,
    objective,
    progress: createObjectiveProgress(),
    playerArmy: army,
    playerKingHP: persisted?.playerKingHP ?? createKingHP(3),
    enemyKingHP: isBoss ? createKingHP(enemyKingHp) : null,
    armySlots: persisted?.armySlots ?? DEFAULT_ARMY_SLOTS,
    artifactSlots: persisted?.artifactSlots ?? createArtifactSlots(),
    completed: false,
    gameOver: false,
    victory: false,
  };
}

function resetArmyPositions(army: Piece[]): Piece[] {
  for (const piece of army) {
    piece.position = { ...piece.lockedPosition };
    piece.hasMoved = false;
    piece.hasCapturedThisTurn = false;
  }
  return army;
}

export function buildGameStateForLevel(level: LevelState, run: RunState, rng: RngFn): GameState {
  const enemies = spawnEnemies(level.template, run.rank, rng);
  const allPieces = [...level.playerArmy, ...enemies];
  const state = createGameState(allPieces);

  // Track initial enemy count for objective completion
  level.progress.initialEnemyCount = enemies.length;

  const extraMoves = getArtifactEffectValue(level.artifactSlots, 'extra_move');
  if (extraMoves > 0) {
    state.maxMovesPerTurn += extraMoves;
    state.movesRemaining = state.maxMovesPerTurn;
  }

  const bonusHP = getArtifactEffectValue(level.artifactSlots, 'king_max_hp');
  if (bonusHP > 0 && level.playerKingHP.max < 3 + bonusHP) {
    const diff = (3 + bonusHP) - level.playerKingHP.max;
    level.playerKingHP.max += diff;
    level.playerKingHP.current += diff;
  }

  applyArtifactMovementBonuses(level);

  state.enemyIntents = computeAllIntents(state.pieces);
  return state;
}

function applyArtifactMovementBonuses(level: LevelState): void {
  const arts = level.artifactSlots;

  for (const piece of level.playerArmy) {
    piece.modifiers = piece.modifiers.filter(m => !m.id.startsWith('artifact_'));

    if (piece.type === 'bishop' && hasArtifactEffect(arts, 'bishop_orthogonal_step')) {
      piece.modifiers.push({
        id: 'artifact_bishop_orth', name: 'Compass Step', description: 'Orthogonal step (artifact)',
        cost: 0, pieceType: 'bishop',
        ability: { type: 'step', directions: 'orthogonal', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
      });
    }

    if (piece.type === 'rook' && hasArtifactEffect(arts, 'rook_diagonal_step')) {
      piece.modifiers.push({
        id: 'artifact_rook_diag', name: 'Angle Step', description: 'Diagonal step (artifact)',
        cost: 0, pieceType: 'rook',
        ability: { type: 'step', directions: 'diagonal', maxRange: 1, canCapture: true, canMoveWithoutCapture: true },
      });
    }

    if (piece.type === 'knight' && hasArtifactEffect(arts, 'knight_extended_range')) {
      piece.modifiers.push({
        id: 'artifact_knight_ext', name: 'Horse Frenzy', description: 'Extended jump (artifact)',
        cost: 0, pieceType: 'knight',
        ability: { type: 'step', directions: 'all', maxRange: 2, canCapture: true, canMoveWithoutCapture: true },
      });
    }

    if (piece.type === 'pawn' && hasArtifactEffect(arts, 'pawn_double_step_always')) {
      piece.modifiers.push({
        id: 'artifact_pawn_double', name: 'Iron Boots', description: 'Move 2 forward every turn (artifact)',
        cost: 0, pieceType: 'pawn',
        ability: { type: 'slide', directions: 'forward', maxRange: 2, canCapture: false, canMoveWithoutCapture: true },
      });
    }

    if (piece.type === 'pawn' && hasArtifactEffect(arts, 'pawn_capture_backward')) {
      piece.modifiers.push({
        id: 'artifact_pawn_back', name: 'Retreat', description: 'Backward diagonal capture (artifact)',
        cost: 0, pieceType: 'pawn',
        ability: { type: 'step', directions: 'backward-diagonal', maxRange: 1, canCapture: true, canMoveWithoutCapture: false },
      });
    }
  }
}

export function checkLevelComplete(level: LevelState, pieces: readonly Piece[]): boolean {
  if (level.completed) return true;
  const done = isObjectiveComplete(level.objective.type, pieces, level.progress);
  if (done) level.completed = true;
  return done;
}

export function onPieceCaptured(level: LevelState): void {
  level.progress.capturedCount++;
}

export function onTurnEnd(level: LevelState): void {
  level.progress.turnsElapsed++;
}

export function checkEnemyPawnPromotion(pieces: Piece[], isBoss: boolean): Piece[] {
  const promoted: Piece[] = [];
  const backRank = BOARD_SIZE - 1;

  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i]!;
    if (p.owner === 'enemy' && p.type === 'pawn' && p.position.row === backRank) {
      promoted.push(p);
      if (isBoss) {
        p.type = 'queen';
      } else {
        pieces.splice(i, 1);
      }
    }
  }

  return promoted;
}
