import { Piece, createPiece } from '../core/piece.js';
import { Objective, ObjectiveProgress, createObjective, createObjectiveProgress, isObjectiveComplete } from '../core/objective.js';
import { GameState, createGameState } from '../core/game.js';
import { LevelTemplate, LEVEL_TEMPLATES } from '../data/templates.js';
import { KingHP, createKingHP } from './king-hp.js';
import { computeAllIntents } from '../ai/intent.js';
import { BOARD_SIZE } from '../utils/types.js';
import { DEFAULT_ARMY_SLOTS } from './shop.js';

export interface LevelState {
  levelNumber: number;
  template: LevelTemplate;
  objective: Objective;
  progress: ObjectiveProgress;
  playerArmy: Piece[];
  playerKingHP: KingHP;
  enemyKingHP: KingHP | null;
  armySlots: number;
  completed: boolean;
  gameOver: boolean;
  extraMoves?: number;
}

function createPlayerArmy(): Piece[] {
  return [
    createPiece('king', 'player', { row: 5, col: 2 }),
    createPiece('queen', 'player', { row: 5, col: 3 }),
    createPiece('rook', 'player', { row: 5, col: 0 }),
    createPiece('knight', 'player', { row: 5, col: 4 }),
    createPiece('pawn', 'player', { row: 4, col: 1 }),
    createPiece('pawn', 'player', { row: 4, col: 3 }),
  ];
}

function spawnEnemies(template: LevelTemplate): Piece[] {
  return template.enemies.map(e => createPiece(e.type, 'enemy', e.position));
}

export interface PersistedRunState {
  playerKingHP?: KingHP;
  playerArmy?: Piece[];
  armySlots?: number;
}

export function createLevel(levelNumber: number, persisted?: PersistedRunState): LevelState {
  const templateIndex = (levelNumber - 1) % LEVEL_TEMPLATES.length;
  const template = LEVEL_TEMPLATES[templateIndex]!;
  const isBoss = template.isBoss === true;
  const enemyKingHp = template.objective.kind === 'defeat_king' ? template.objective.hp : 0;

  // Carry army across levels — reset positions to locked positions
  const army = persisted?.playerArmy
    ? resetArmyPositions(persisted.playerArmy)
    : createPlayerArmy();

  return {
    levelNumber,
    template,
    objective: createObjective(template.objective),
    progress: createObjectiveProgress(),
    playerArmy: army,
    playerKingHP: persisted?.playerKingHP ?? createKingHP(3),
    enemyKingHP: isBoss ? createKingHP(enemyKingHp) : null,
    armySlots: persisted?.armySlots ?? DEFAULT_ARMY_SLOTS,
    completed: false,
    gameOver: false,
  };
}

/** Reset all army pieces to their locked (starting) positions and clear hasMoved. */
function resetArmyPositions(army: Piece[]): Piece[] {
  for (const piece of army) {
    piece.position = { ...piece.lockedPosition };
    piece.hasMoved = false;
  }
  return army;
}

export function buildGameStateForLevel(level: LevelState): GameState {
  const enemies = spawnEnemies(level.template);
  const allPieces = [...level.playerArmy, ...enemies];
  const state = createGameState(allPieces);
  state.enemyIntents = computeAllIntents(state.pieces);
  return state;
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

/**
 * Check for enemy pawns that reached the player's back rank (row = BOARD_SIZE - 1).
 * Each one deals 1 damage to the player king and is removed.
 * Returns the number of pawns promoted.
 */
export function checkEnemyPawnPromotion(pieces: Piece[]): Piece[] {
  const promoted: Piece[] = [];
  const backRank = BOARD_SIZE - 1;

  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i]!;
    if (p.owner === 'enemy' && p.type === 'pawn' && p.position.row === backRank) {
      promoted.push(p);
      pieces.splice(i, 1);
    }
  }

  return promoted;
}
