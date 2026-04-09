import { initCanvas, resizeCanvas, CanvasContext, pixelToBoard } from './rendering/canvas.js';
import { drawBoard } from './rendering/board-renderer.js';
import { drawPieces } from './rendering/piece-renderer.js';
import { drawIntents } from './rendering/intent-renderer.js';
import {
  drawHUD, drawLevelComplete, drawGameOver,
  getEndTurnButton, getNextLevelButton, getRestartButton, isInsideButton,
  ButtonRect, RunStats,
} from './rendering/ui-renderer.js';
import { drawShop, getShopCards, getArtifactRects, getContinueButton, getCancelButton, shopGridHitTest, PlacementState, ModifierApplyState, getSelectedPieceId, setSelectedPieceId } from './rendering/shop-renderer.js';
import { addArtifact, canAddArtifact, removeArtifact, hasArtifactEffect, getArtifactEffectValue } from './core/artifact.js';
import { ModifierDef, MAX_MODIFIER_SLOTS } from './core/modifier.js';
import { positionEquals } from './core/board.js';
import { Piece, createPiece, PieceType } from './core/piece.js';
import { Move } from './core/movement.js';
import {
  GameState, usePlayerMove, isPlayerTurnOver,
  startEnemyTurn, startPlayerTurn,
} from './core/game.js';
import {
  SelectionState, createSelectionState, handleBoardClick, clearSelection,
  executeMove, computeEnPassant,
} from './input/click-handler.js';
import { computeAllIntents, recalculateIntents } from './ai/intent.js';
import { handleKingHit } from './systems/king-hp.js';
import { RunState, createRunState, advanceRun, hasMutation } from './systems/run.js';
import { GameEvent, EventEffect, rollEvent } from './systems/events.js';
import { drawEventScreen, getEventOptionButtons } from './rendering/event-renderer.js';
import { PromotionRecord, checkPlayerPawnPromotion, revertPromotions } from './systems/promotion.js';
import { createRng, RngFn } from './utils/rng.js';
import {
  LevelState, createLevel, buildGameStateForLevel, checkLevelComplete,
  onPieceCaptured, onTurnEnd, checkEnemyPawnPromotion,
} from './systems/level.js';
import {
  Economy, createEconomy, earnGold, spendGold,
  GOLD_PER_CAPTURE, GOLD_LEVEL_COMPLETE, GOLD_BOSS_COMPLETE,
} from './systems/economy.js';
import { ShopItem, generateShopItems, generateReplacementItem, MAX_ARMY_SLOTS } from './systems/shop.js';
import { BOARD_SIZE } from './utils/types.js';

type Screen = 'level' | 'event' | 'shop';

let cc: CanvasContext;
let state: GameState;
let selection: SelectionState;
let level: LevelState;
let run: RunState;
let rng: RngFn;
let economy: Economy;
let screen: Screen = 'level';
let shopItems: ShopItem[] = [];
let placement: PlacementState | null = null;
let modifierApply: ModifierApplyState | null = null;
let pendingModifier: ModifierDef | null = null;
let pendingPlacementCost = 0;
let pendingShopIndex = -1;
let currentEvent: GameEvent | null = null;
let promotionRecords: PromotionRecord[] = [];

// ─── Level management ────────────────────────────────────

function startNewRun(seed?: number): void {
  const s = seed ?? Date.now();
  rng = createRng(s);
  economy = createEconomy();
  run = createRunState(s);
  level = createLevel(run, rng);
  state = buildGameStateForLevel(level, run, rng);
  selection = createSelectionState();
  promotionRecords = [];
  screen = 'level';
  applyMutationsToState();
}

function startNextLevel(): void {
  // Revert promotions before carrying army over
  revertPromotions(level.playerArmy, promotionRecords);
  promotionRecords = [];

  const persisted = {
    playerKingHP: level.playerKingHP,
    playerArmy: level.playerArmy,
    armySlots: level.armySlots,
    artifactSlots: level.artifactSlots,
  };
  advanceRun(run, rng);
  level = createLevel(run, rng, persisted);
  state = buildGameStateForLevel(level, run, rng);
  selection = createSelectionState();
  screen = 'level';
  applyMutationsToState();
}

function applyMutationsToState(): void {
  if (hasMutation(run, 'player_fewer_moves') && state.maxMovesPerTurn > 1) {
    state.maxMovesPerTurn--;
    state.movesRemaining = state.maxMovesPerTurn;
  }
}

function applyEvent(effect: EventEffect): void {
  switch (effect.kind) {
    case 'bonus_gold':
      earnGold(economy, effect.amount);
      run.totalGoldEarned += effect.amount;
      break;
    case 'heal':
      level.playerKingHP.current = Math.min(level.playerKingHP.max, level.playerKingHP.current + effect.amount);
      break;
    case 'extra_move_this_level':
      level.extraMoves = (level.extraMoves ?? 0) + 1;
      break;
    case 'bonus_gold_next_captures':
      run.bountyCaptures = effect.captures;
      run.bountyGold = effect.amount;
      break;
    case 'nothing':
      break;
  }
}

function enterShop(): void {
  const ownedIds = new Set(level.artifactSlots.artifacts.map(a => a.id));
  const ownedTypes = new Set(level.playerArmy.map(p => p.type));
  shopItems = generateShopItems(rng, level.armySlots, ownedIds, ownedTypes);
  placement = null;
  modifierApply = null;
  pendingModifier = null;
  screen = 'shop';
}

function getPlacementInfo(army: readonly Piece[], pieceType: PieceType): { empty: Position[]; replaceable: Position[] } {
  const occupiedMap = new Map<string, Piece>();
  for (const p of army) {
    occupiedMap.set(`${p.lockedPosition.row},${p.lockedPosition.col}`, p);
  }

  const allowedRows = pieceType === 'pawn'
    ? [BOARD_SIZE - 2]
    : [BOARD_SIZE - 1];

  const empty: Position[] = [];
  const replaceable: Position[] = [];

  for (const row of allowedRows) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const key = `${row},${col}`;
      const existing = occupiedMap.get(key);
      if (!existing) {
        empty.push({ row, col });
      } else if (existing.type !== 'king') {
        replaceable.push({ row, col });
      }
    }
  }
  return { empty, replaceable };
}

function replaceShopItem(index: number): void {
  const ownedIds = new Set(level.artifactSlots.artifacts.map(a => a.id));
  const ownedTypes = new Set(level.playerArmy.map(p => p.type));
  shopItems[index] = generateReplacementItem(rng, level.armySlots, ownedIds, ownedTypes);
}

function isItemUsable(item: ShopItem): boolean {
  if (item.type.kind === 'heal' && level.playerKingHP.current >= level.playerKingHP.max) return false;
  if (item.type.kind === 'army_slot' && level.armySlots >= MAX_ARMY_SLOTS) return false;
  if (item.type.kind === 'piece' && level.playerArmy.length >= level.armySlots) return false;
  if (item.type.kind === 'artifact' && !canAddArtifact(level.artifactSlots)) return false;
  if (item.type.kind === 'modifier') {
    const mod = item.type.modifier;
    const canApplyToAny = level.playerArmy.some(
      p => p.type === mod.pieceType
        && p.modifiers.length < MAX_MODIFIER_SLOTS
        && !p.modifiers.some(m => m.id === mod.id),
    );
    if (!canApplyToAny) return false;
  }
  return true;
}

function buyItem(item: ShopItem, index: number): void {
  if (placement || modifierApply) return;
  if (!isItemUsable(item)) return;
  if (!spendGold(economy, item.cost)) return;

  switch (item.type.kind) {
    case 'piece': {
      const { empty, replaceable } = getPlacementInfo(level.playerArmy, item.type.pieceType);
      const canPlaceEmpty = level.playerArmy.length < level.armySlots && empty.length > 0;
      const validSquares = canPlaceEmpty ? empty : [];
      placement = { pieceType: item.type.pieceType, validSquares, replaceableSquares: replaceable };
      pendingPlacementCost = item.cost;
      pendingShopIndex = index;
      setSelectedPieceId(null);
      break;
    }
    case 'heal': {
      level.playerKingHP.current = Math.min(level.playerKingHP.max, level.playerKingHP.current + item.type.amount);
      replaceShopItem(index);
      break;
    }
    case 'extra_move': {
      level.extraMoves = (level.extraMoves ?? 0) + 1;
      replaceShopItem(index);
      break;
    }
    case 'army_slot': {
      level.armySlots++;
      replaceShopItem(index);
      break;
    }
    case 'artifact': {
      addArtifact(level.artifactSlots, item.type.artifact);
      if (item.type.artifact.effect.kind === 'extra_slot') {
        level.artifactSlots.maxSlots++;
      }
      replaceShopItem(index);
      break;
    }
    case 'modifier': {
      pendingModifier = item.type.modifier;
      modifierApply = { modifierId: item.type.modifier.id, modifierName: item.type.modifier.name, pieceType: item.type.modifier.pieceType };
      setSelectedPieceId(null);
      pendingPlacementCost = item.cost;
      pendingShopIndex = index;
      break;
    }
  }
}

// ─── King-aware move execution ───────────────────────────

function performMove(move: Move): boolean {
  if (move.capturedPieceId) {
    const target = state.pieces.find(p => p.id === move.capturedPieceId);

    if (target && target.type === 'king') {
      const hp = target.owner === 'player' ? level.playerKingHP : level.enemyKingHP;
      if (hp) {
        const attacker = state.pieces.find(p => positionEquals(p.position, move.from));
        if (attacker) {
          attacker.position = { ...move.to };
          attacker.hasMoved = true;
          attacker.hasCapturedThisTurn = true;
        }

        // Check "king ignores hit" artifact
        let dodged = false;
        if (target.owner === 'player') {
          for (const a of level.artifactSlots.artifacts) {
            if (a.effect.kind === 'king_extra_hp_on_hit' && rng() < a.effect.chance) {
              dodged = true;
              break;
            }
          }
        }

        if (!dodged) {
          const survived = handleKingHit(target, hp, state.pieces, rng);
          if (!survived) {
            if (target.owner === 'player') {
              level.gameOver = true;
            } else {
              level.progress.enemyKingDefeated = true;
            }
          }
        }

        onPieceCaptured(level);
        onCaptureRewards();
        return !level.gameOver;
      }
    }
  }

  const hadCapture = !!move.capturedPieceId;
  executeMove(move, state.pieces);
  if (hadCapture) {
    onPieceCaptured(level);
    onCaptureRewards();
  }
  return true;
}

function onCaptureRewards(): void {
  const bonusGold = getArtifactEffectValue(level.artifactSlots, 'gold_per_capture');
  let bounty = 0;
  if (run.bountyCaptures > 0) {
    bounty = run.bountyGold;
    run.bountyCaptures--;
  }
  const earned = GOLD_PER_CAPTURE + bonusGold + bounty;
  earnGold(economy, earned);
  run.totalCaptures++;
  run.totalGoldEarned += earned;

  // Capture heals
  for (const a of level.artifactSlots.artifacts) {
    if (a.effect.kind === 'capture_heals' && level.playerKingHP.current < level.playerKingHP.max) {
      if (rng() < a.effect.chance) {
        level.playerKingHP.current++;
      }
    }
  }
}

// ─── Render ──────────────────────────────────────────────

function render(): void {
  cc.ctx.clearRect(0, 0, cc.canvas.width, cc.canvas.height);

  if (screen === 'event' && currentEvent) {
    drawEventScreen(cc, currentEvent);
    return;
  }

  if (screen === 'shop') {
    drawShop(cc, shopItems, economy, level.playerArmy, level.armySlots, level.playerKingHP, level.artifactSlots, placement, modifierApply);
    return;
  }

  drawBoard(cc, selection.selectedPiece?.position ?? null, selection.legalMoves);
  if (!hasMutation(run, 'fog_of_war')) {
    drawIntents(cc, state.enemyIntents, state.pieces);
  }
  drawPieces(cc, state.pieces);
  drawHUD(cc, state, level, economy, run.rank, selection.selectedPiece);

  if (level.gameOver) drawGameOver(cc, {
    rank: run.rank,
    levelsCleared: run.totalLevelsCleared,
    totalCaptures: run.totalCaptures,
    totalGoldEarned: run.totalGoldEarned,
    seed: run.seed,
  });
  else if (level.completed) drawLevelComplete(cc);
}

// ─── Enemy turn execution ────────────────────────────────

const ENEMY_MOVE_DELAY_MS = 400;

function executeEnemyTurn(): void {
  startEnemyTurn(state);
  clearSelection(selection);
  state.enPassants = [];
  render();

  const intents = [...state.enemyIntents];
  let i = 0;

  function executeNext(): void {
    if (level.gameOver) { render(); return; }

    if (i >= intents.length) {
      const promoted = checkEnemyPawnPromotion(state.pieces);
      for (const _ of promoted) {
        const playerKing = state.pieces.find(p => p.owner === 'player' && p.type === 'king');
        if (playerKing) {
          const survived = handleKingHit(playerKing, level.playerKingHP, state.pieces, rng);
          if (!survived) { level.gameOver = true; render(); return; }
        }
      }

      onTurnEnd(level);
      startPlayerTurn(state);
      state.enemyIntents = computeAllIntents(state.pieces);
      checkLevelComplete(level, state.pieces);
      render();
      return;
    }

    const intent = intents[i]!;
    const piece = state.pieces.find(p => p.id === intent.pieceId);
    if (piece) {
      if (intent.move.capturedPieceId) {
        const target = state.pieces.find(p => p.id === intent.move.capturedPieceId);
        if (!target || target.owner === piece.owner) {
          i++;
          executeNext();
          return;
        }
      }

      performMove(intent.move);

      const ep = computeEnPassant(intent.move, state.pieces);
      if (ep) state.enPassants.push(ep);
    }
    i++;
    render();

    if (level.gameOver) return;
    setTimeout(executeNext, ENEMY_MOVE_DELAY_MS);
  }

  setTimeout(executeNext, ENEMY_MOVE_DELAY_MS);
}

// ─── Click handling ──────────────────────────────────────

function onShopClick(x: number, y: number): void {
  // If in placement mode, check cancel or grid click
  if (placement) {
    // Cancel button
    if (isInsideButton(getCancelButton(), x, y)) {
      earnGold(economy, pendingPlacementCost);
      placement = null;
      pendingPlacementCost = 0;
      render();
      return;
    }

    const pos = shopGridHitTest(x, y);
    if (pos) {
      const isEmptySlot = placement.validSquares.some(s => s.row === pos.row && s.col === pos.col);
      const isReplace = placement.replaceableSquares.some(s => s.row === pos.row && s.col === pos.col);

      if (isEmptySlot) {
        level.playerArmy.push(createPiece(placement.pieceType, 'player', pos));
        replaceShopItem(pendingShopIndex);
        placement = null;
        pendingPlacementCost = 0;
      } else if (isReplace) {
        const idx = level.playerArmy.findIndex(
          p => p.lockedPosition.row === pos.row && p.lockedPosition.col === pos.col,
        );
        if (idx !== -1) level.playerArmy.splice(idx, 1);
        level.playerArmy.push(createPiece(placement.pieceType, 'player', pos));
        replaceShopItem(pendingShopIndex);
        placement = null;
        pendingPlacementCost = 0;
      }
    }
    render();
    return;
  }

  // If in modifier apply mode
  if (modifierApply && pendingModifier) {
    // Cancel
    if (isInsideButton(getCancelButton(), x, y)) {
      earnGold(economy, pendingPlacementCost);
      modifierApply = null;
      pendingModifier = null;
      pendingPlacementCost = 0;
      render();
      return;
    }

    const pos = shopGridHitTest(x, y);
    if (pos) {
      const piece = level.playerArmy.find(
        p => p.lockedPosition.row === pos.row && p.lockedPosition.col === pos.col,
      );
      if (
        piece
        && piece.type === pendingModifier.pieceType
        && piece.modifiers.length < MAX_MODIFIER_SLOTS
        && !piece.modifiers.some(m => m.id === pendingModifier!.id)
      ) {
        piece.modifiers.push(pendingModifier);
        replaceShopItem(pendingShopIndex);
        modifierApply = null;
        pendingModifier = null;
        pendingPlacementCost = 0;
      }
    }
    render();
    return;
  }

  // Check shop cards
  for (const card of getShopCards()) {
    if (isInsideButton(card, x, y)) {
      const item = shopItems[card.index];
      if (item) buyItem(item, card.index);
      render();
      return;
    }
  }

  // Check artifact discard
  for (const rect of getArtifactRects()) {
    if (isInsideButton(rect, x, y)) {
      removeArtifact(level.artifactSlots, rect.index);
      render();
      return;
    }
  }

  // Continue button
  if (isInsideButton(getContinueButton(), x, y)) {
    const extraMoves = level.extraMoves ?? 0;
    startNextLevel();
    if (extraMoves) {
      state.maxMovesPerTurn += extraMoves;
      state.movesRemaining = state.maxMovesPerTurn;
    }
    render();
    return;
  }

  // Click on grid to select/deselect a piece (inspect modifiers)
  const pos = shopGridHitTest(x, y);
  if (pos) {
    const piece = level.playerArmy.find(
      p => p.lockedPosition.row === pos.row && p.lockedPosition.col === pos.col,
    );
    if (piece) {
      setSelectedPieceId(getSelectedPieceId() === piece.id ? null : piece.id);
    } else {
      setSelectedPieceId(null);
    }
    render();
  }
}

function onClick(e: MouseEvent): void {
  const rect = cc.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (screen === 'event' && currentEvent) {
    for (let i = 0; i < getEventOptionButtons().length; i++) {
      const btn = getEventOptionButtons()[i]!;
      if (isInsideButton(btn, x, y)) {
        const opt = currentEvent.options[i]!;
        applyEvent(opt.effect);
        currentEvent = null;
        if (level.gameOver) { render(); return; }
        enterShop();
        render();
        return;
      }
    }
    return;
  }

  if (screen === 'shop') {
    onShopClick(x, y);
    return;
  }

  if (level.gameOver) {
    if (isInsideButton(getRestartButton(), x, y)) { startNewRun(); render(); }
    return;
  }

  if (level.completed) {
    if (isInsideButton(getNextLevelButton(), x, y)) {
      // Award gold for completing the level
      const bonus = level.template.levelType === 'boss' ? GOLD_BOSS_COMPLETE : GOLD_LEVEL_COMPLETE;
      const artifactBonus = getArtifactEffectValue(level.artifactSlots, 'gold_per_level');
      const totalBonus = bonus + artifactBonus;
      earnGold(economy, totalBonus);
      run.totalGoldEarned += totalBonus;

      // Roll for random event
      currentEvent = rollEvent(rng);
      if (currentEvent) {
        screen = 'event';
      } else {
        enterShop();
      }
      render();
    }
    return;
  }

  if (isInsideButton(getEndTurnButton(), x, y)) {
    if (state.phase === 'player_turn') executeEnemyTurn();
    return;
  }

  if (state.phase !== 'player_turn') return;

  const pos = pixelToBoard(cc, x, y);
  if (!pos) return;

  const move = handleBoardClick(pos, state.pieces, selection, state.enPassants);

  if (move) {
    performMove(move);
    usePlayerMove(state);

    state.enPassants = [];
    const ep = computeEnPassant(move, state.pieces);
    if (ep) state.enPassants.push(ep);

    // Check player pawn promotion
    const newPromotions = checkPlayerPawnPromotion(state.pieces);
    promotionRecords.push(...newPromotions);

    state.enemyIntents = recalculateIntents(state.enemyIntents, state.pieces);

    checkLevelComplete(level, state.pieces);
    if (level.completed || level.gameOver) { render(); return; }

    if (isPlayerTurnOver(state)) {
      render();
      setTimeout(() => executeEnemyTurn(), 300);
      return;
    }
  }

  render();
}

// ─── Init ────────────────────────────────────────────────

function init(): void {
  cc = initCanvas('game-canvas');
  rng = createRng(Date.now());
  economy = createEconomy();
  startNewRun();

  cc.canvas.addEventListener('click', onClick);
  window.addEventListener('resize', () => { cc = resizeCanvas(cc); render(); });

  render();
}

init();
