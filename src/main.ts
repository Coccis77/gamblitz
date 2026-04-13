import { initCanvas, resizeCanvas, CanvasContext, pixelToBoard } from './rendering/canvas.js';
import { drawBoard, computeThreatSquares } from './rendering/board-renderer.js';
import { drawPieces } from './rendering/piece-renderer.js';
import { preloadPieceImages } from './rendering/piece-images.js';
import { drawIntents, drawIntentBadges } from './rendering/intent-renderer.js';
import {
  drawHUD, drawLevelComplete, drawGameOver, drawVictory,
  getEndTurnButton, getNextLevelButton, getRestartButton, isInsideButton,
  RunStats, getArtifactHitBoxes,
} from './rendering/ui-renderer.js';
import { drawShop, getShopCards, getArtifactRects, getContinueButton, getCancelButton, shopGridHitTest, PlacementState, ModifierApplyState, getSelectedPieceId, setSelectedPieceId } from './rendering/shop-renderer.js';
import { addArtifact, canAddArtifact, removeArtifact, getArtifactEffectValue, ArtifactDef } from './core/artifact.js';
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
import { drawTitleScreen, getTitleStartButton } from './rendering/title-renderer.js';
import { drawDraftScreen, getDraftButtons } from './rendering/draft-renderer.js';
import { ALL_ARTIFACTS } from './data/artifacts.js';
import { drawTutorialScreen, getTutorialNextButton, getTutorialSkipButton, getTutorialPageCount } from './rendering/tutorial-renderer.js';
import { startFadeOut, isFading, updateFade, drawFade } from './rendering/transition.js';
import { addFlash, updateEffects, hasActiveEffects, drawEffects } from './rendering/effects.js';
import { startMoveAnimation, updateAnimation, isAnimating } from './rendering/animation.js';
import { createRng, RngFn } from './utils/rng.js';
import {
  LevelState, createLevel, buildGameStateForLevel, checkLevelComplete,
  onPieceCaptured, onTurnEnd, checkEnemyPawnPromotion,
} from './systems/level.js';
import {
  Economy, createEconomy, earnGold, spendGold,
  GOLD_PER_CAPTURE, getCompletionGold,
} from './systems/economy.js';
import { ShopItem, generateShopItems, generateReplacementItem, MAX_ARMY_SLOTS } from './systems/shop.js';
import { BOARD_SIZE, Position } from './utils/types.js';

type Screen = 'title' | 'tutorial' | 'draft' | 'level' | 'event' | 'shop';

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
let tutorialPage = 0;
let draftArtifacts: ArtifactDef[] = [];
let hoveredArtifact: ArtifactDef | null = null;
let teleportChoices: Position[] | null = null; // squares player can teleport king to
let teleportKingId: string | null = null;

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
  teleportChoices = null;
  teleportKingId = null;

  // Pick 2 random artifacts for draft (starters only)
  const starters = ALL_ARTIFACTS.filter(a => a.isStarter);
  const shuffled = [...starters].sort(() => rng() - 0.5);
  draftArtifacts = shuffled.slice(0, 2);
  screen = 'draft';
}

function finishDraft(): void {
  // Rebuild game state now that the starter artifact is equipped
  state = buildGameStateForLevel(level, run, rng);
  screen = 'level';
  applyMutationsToState();
}

function startNextLevel(): void {
  // Clear any pending teleport state
  teleportChoices = null;
  teleportKingId = null;

  // Revert promotions before carrying army over
  revertPromotions(level.playerArmy, promotionRecords);
  promotionRecords = [];

  // Reset king position if it's off-board from a hit
  for (const piece of level.playerArmy) {
    if (piece.position.row < 0 || piece.position.col < 0) {
      piece.position = { ...piece.lockedPosition };
    }
  }

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
  if (item.type.kind === 'artifact_upgrade') {
    const hasBase = level.artifactSlots.artifacts.some(a => a.id === item.type.upgrade.baseArtifactId);
    if (!hasBase) return false;
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
    case 'artifact_upgrade': {
      const upgrade = item.type.upgrade;
      // Remove the base artifact
      const baseIdx = level.artifactSlots.artifacts.findIndex(a => a.id === upgrade.baseArtifactId);
      if (baseIdx !== -1) {
        level.artifactSlots.artifacts.splice(baseIdx, 1);
      }
      addArtifact(level.artifactSlots, upgrade.upgraded);
      replaceShopItem(index);
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
          startMoveAnimation(attacker.id, move.from, move.to);
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
          const result = handleKingHit(target, hp, state.pieces, rng);
          addFlash(move.to, 'rgb(255, 200, 50)');
          if (result.outcome === 'defeated' || result.outcome === 'no_safe_square') {
            if (target.owner === 'player') {
              level.gameOver = true;
            } else {
              level.progress.enemyKingDefeated = true;
            }
          } else if (result.outcome === 'choose_teleport') {
            teleportChoices = result.squares;
            teleportKingId = target.id;
          }
        }

        // Only count as a capture if the king was actually defeated
        if (level.progress.enemyKingDefeated || level.gameOver) {
          onPieceCaptured(level);
        }
        onCaptureRewards();
        return !level.gameOver;
      }
    }
  }

  const movingPiece = state.pieces.find(p => positionEquals(p.position, move.from));
  const isPlayerCapture = movingPiece?.owner === 'player' && !!move.capturedPieceId;
  if (movingPiece) {
    startMoveAnimation(movingPiece.id, move.from, move.to);
  }
  const hadCapture = !!move.capturedPieceId;
  executeMove(move, state.pieces);
  if (hadCapture) {
    addFlash(move.to, 'rgb(255, 50, 50)');
    if (isPlayerCapture) {
      onPieceCaptured(level);
    }
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

function checkObjectiveAndVictory(): void {
  checkLevelComplete(level, state.pieces);
}

function drawTeleportChoices(): void {
  if (!teleportChoices) return;

  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const pulse = (Math.sin(Date.now() / 250) + 1) / 2;

  for (const sq of teleportChoices) {
    const sx = boardOriginX + sq.col * squareSize;
    const sy = boardOriginY + sq.row * squareSize;
    const alpha = 0.25 + pulse * 0.2;
    ctx.fillStyle = `rgba(80, 160, 255, ${alpha})`;
    ctx.fillRect(sx, sy, squareSize, squareSize);
    ctx.strokeStyle = `rgba(100, 180, 255, ${alpha + 0.2})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
  }

  const bannerH = Math.floor(squareSize * 0.45);
  const bannerY = boardOriginY + 4;
  const boardW = squareSize * BOARD_SIZE;
  ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
  ctx.beginPath();
  ctx.roundRect(boardOriginX + 4, bannerY, boardW - 8, bannerH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#8cf';
  ctx.font = `bold ${Math.floor(squareSize * 0.22)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Click a blue square to teleport your King', boardOriginX + boardW / 2, bannerY + bannerH / 2);
}

function drawArtifactTooltip(): void {
  if (!hoveredArtifact || screen !== 'level') return;

  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const fontSize = Math.max(12, Math.floor(squareSize * 0.18));
  const padding = 8;
  const { name, description } = hoveredArtifact;

  ctx.font = `bold ${fontSize}px sans-serif`;
  const nameW = ctx.measureText(name).width;
  ctx.font = `${fontSize}px sans-serif`;
  const descW = ctx.measureText(description).width;
  const boxW = Math.max(nameW, descW) + padding * 2;
  const boxH = fontSize * 2 + padding * 2 + 4;
  const boxX = boardOriginX;
  const boxY = boardOriginY + squareSize * BOARD_SIZE - boxH - 4;

  ctx.fillStyle = 'rgba(20, 20, 40, 0.92)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 6);
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f0c040';
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(name, boxX + padding, boxY + padding);

  ctx.fillStyle = '#ccc';
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillText(description, boxX + padding, boxY + padding + fontSize + 4);
}

function buildRunStats(): RunStats {
  return {
    rank: run.rank,
    levelsCleared: run.totalLevelsCleared,
    totalCaptures: run.totalCaptures,
    totalGoldEarned: run.totalGoldEarned,
    seed: run.seed,
  };
}

function render(): void {
  cc.ctx.clearRect(0, 0, cc.canvas.width, cc.canvas.height);

  if (screen === 'title') {
    drawTitleScreen(cc);
    drawFade(cc.ctx, cc.canvas.width, cc.canvas.height);
    return;
  }

  if (screen === 'tutorial') {
    drawTutorialScreen(cc, tutorialPage);
    drawFade(cc.ctx, cc.canvas.width, cc.canvas.height);
    return;
  }

  if (screen === 'draft') {
    drawDraftScreen(cc, draftArtifacts);
    drawFade(cc.ctx, cc.canvas.width, cc.canvas.height);
    return;
  }

  if (screen === 'event' && currentEvent) {
    drawEventScreen(cc, currentEvent);
    return;
  }

  if (screen === 'shop') {
    drawShop(cc, shopItems, economy, level.playerArmy, level.armySlots, level.playerKingHP, level.artifactSlots, placement, modifierApply);
    return;
  }

  const threats = computeThreatSquares(state.pieces);
  drawBoard(cc, selection.selectedPiece?.position ?? null, selection.legalMoves, threats);
  drawEffects(cc.ctx, cc.boardOriginX, cc.boardOriginY, cc.squareSize);
  if (!hasMutation(run, 'fog_of_war')) {
    drawIntents(cc, state.enemyIntents, state.pieces);
  }
  drawPieces(cc, state.pieces);
  if (!hasMutation(run, 'fog_of_war')) {
    drawIntentBadges(cc, state.enemyIntents, state.pieces);
  }

  drawTeleportChoices();
  drawHUD(cc, state, level, economy, run.rank, selection.selectedPiece);

  const runStats = buildRunStats();
  if (level.gameOver) {
    drawGameOver(cc, runStats);
  } else if (level.victory) {
    drawVictory(cc, runStats);
  } else if (level.completed) {
    const completionGold = getCompletionGold(state.turnNumber, level.template.levelType);
    const captureGold = level.progress.capturedCount * GOLD_PER_CAPTURE;
    const isBoss = level.template.levelType === 'boss';
    drawLevelComplete(cc, completionGold + captureGold, level.progress.capturedCount, isBoss, isBoss ? run.rank + 1 : undefined);
  }

  drawArtifactTooltip();
  drawFade(cc.ctx, cc.canvas.width, cc.canvas.height);
}

// ─── Enemy turn execution ────────────────────────────────

const ENEMY_MOVE_DELAY_MS = 400;

function executeEnemyTurn(): void {
  startEnemyTurn(state);
  clearSelection(selection);
  state.enPassants = [];
  render();

  let intents = [...state.enemyIntents];
  let i = 0;
  let enemyPass = 0;

  function executeNext(): void {
    if (level.gameOver) { render(); return; }

    if (i >= intents.length) {
      const isBoss = level.template.levelType === 'boss';
      const promoted = checkEnemyPawnPromotion(state.pieces, isBoss);
      if (!isBoss) {
        // Non-boss: pawns were removed, count toward objectives
        level.progress.enemyPawnsPromotedOff += promoted.length;
      }
      for (const _ of promoted) {
        const playerKing = state.pieces.find(p => p.owner === 'player' && p.type === 'king');
        if (playerKing) {
          const hitResult = handleKingHit(playerKing, level.playerKingHP, state.pieces, rng);
          if (hitResult.outcome === 'defeated' || hitResult.outcome === 'no_safe_square') { level.gameOver = true; render(); return; }
          if (hitResult.outcome === 'choose_teleport') {
            teleportChoices = hitResult.squares;
            teleportKingId = playerKing.id;
          }
        }
      }

      if (enemyPass === 0 && hasMutation(run, 'enemy_extra_move')) {
        enemyPass++;
        intents = computeAllIntents(state.pieces);
        i = 0;
        setTimeout(executeNext, ENEMY_MOVE_DELAY_MS);
        return;
      }

      onTurnEnd(level);
      startPlayerTurn(state);
      state.enemyIntents = computeAllIntents(state.pieces);
      checkObjectiveAndVictory();
      render();
      return;
    }

    const intent = intents[i]!;
    const piece = state.pieces.find(p => p.id === intent.pieceId);
    if (piece) {
      // Skip if target square is now occupied by a friendly piece
      const occupant = state.pieces.find(
        p => p.id !== piece.id && p.position.row === intent.move.to.row && p.position.col === intent.move.to.col,
      );
      if (occupant && occupant.owner === piece.owner) {
        i++;
        executeNext();
        return;
      }

      // Skip if capture target is gone or now friendly
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
    startFadeOut(() => {
      startNextLevel();
      if (extraMoves) {
        state.maxMovesPerTurn += extraMoves;
        state.movesRemaining = state.maxMovesPerTurn;
      }
    }, 0.06);
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

function onTitleClick(x: number, y: number): void {
  if (isInsideButton(getTitleStartButton(), x, y)) {
    tutorialPage = 0;
    startFadeOut(() => { screen = 'tutorial'; }, 0.06);
  }
}

function onTutorialClick(x: number, y: number): void {
  if (isInsideButton(getTutorialSkipButton(), x, y)) {
    startFadeOut(() => { startNewRun(); }, 0.06);
    return;
  }
  if (isInsideButton(getTutorialNextButton(), x, y)) {
    if (tutorialPage < getTutorialPageCount() - 1) {
      tutorialPage++;
      render();
    } else {
      startFadeOut(() => { startNewRun(); }, 0.06);
    }
  }
}

function onDraftClick(x: number, y: number): void {
  const buttons = getDraftButtons();
  for (let i = 0; i < buttons.length; i++) {
    if (isInsideButton(buttons[i]!, x, y)) {
      const chosen = draftArtifacts[i]!;
      addArtifact(level.artifactSlots, chosen);
      if (chosen.effect.kind === 'extra_slot') {
        level.artifactSlots.maxSlots++;
      }
      startFadeOut(() => { finishDraft(); }, 0.06);
      return;
    }
  }
}

function onEventClick(x: number, y: number): void {
  if (!currentEvent) return;

  const buttons = getEventOptionButtons();
  for (let i = 0; i < buttons.length; i++) {
    if (isInsideButton(buttons[i]!, x, y)) {
      const opt = currentEvent.options[i]!;
      applyEvent(opt.effect);
      currentEvent = null;
      if (level.gameOver) { render(); return; }
      fadeToShop();
      return;
    }
  }
}

function onLevelCompleteClick(x: number, y: number): void {
  if (!isInsideButton(getNextLevelButton(), x, y)) return;

  const bonus = getCompletionGold(state.turnNumber, level.template.levelType);
  const artifactBonus = getArtifactEffectValue(level.artifactSlots, 'gold_per_level');
  const totalBonus = bonus + artifactBonus;
  earnGold(economy, totalBonus);
  run.totalGoldEarned += totalBonus;

  currentEvent = rollEvent(rng);
  if (currentEvent) {
    fadeToEvent();
  } else {
    fadeToShop();
  }
}

function onTeleportClick(x: number, y: number): void {
  const pos = pixelToBoard(cc, x, y);
  if (pos && teleportChoices!.some(s => s.row === pos.row && s.col === pos.col)) {
    const king = state.pieces.find(p => p.id === teleportKingId);
    if (king) {
      king.position = { ...pos };
    }
    teleportChoices = null;
    teleportKingId = null;
    render();
  }
}

function onBoardClick(x: number, y: number): void {
  if (isInsideButton(getEndTurnButton(), x, y)) {
    if (state.phase === 'player_turn') executeEnemyTurn();
    return;
  }

  if (teleportChoices && teleportKingId) {
    onTeleportClick(x, y);
    return;
  }

  if (state.phase !== 'player_turn') return;

  const pos = pixelToBoard(cc, x, y);
  if (!pos) return;

  const move = handleBoardClick(pos, state.pieces, selection, state.enPassants);
  if (!move) { render(); return; }

  performMove(move);
  usePlayerMove(state);

  state.enPassants = [];
  const ep = computeEnPassant(move, state.pieces);
  if (ep) state.enPassants.push(ep);

  // Check objective before promotion (pawn on row 0 counts before becoming queen)
  checkObjectiveAndVictory();
  if (level.completed || level.gameOver) { render(); return; }

  // Check player pawn promotion
  const newPromotions = checkPlayerPawnPromotion(state.pieces);
  promotionRecords.push(...newPromotions);

  state.enemyIntents = recalculateIntents(state.enemyIntents, state.pieces);

  if (isPlayerTurnOver(state)) {
    render();
    setTimeout(() => executeEnemyTurn(), 300);
    return;
  }

  render();
}

function onClick(e: MouseEvent): void {
  if (isFading() || isAnimating()) return;

  const rect = cc.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  switch (screen) {
    case 'title':    onTitleClick(x, y); return;
    case 'tutorial': onTutorialClick(x, y); return;
    case 'draft':    onDraftClick(x, y); return;
    case 'event':    onEventClick(x, y); return;
    case 'shop':     onShopClick(x, y); return;
    case 'level':    break;
  }

  if (level.gameOver) {
    if (isInsideButton(getRestartButton(), x, y)) fadeToRestart();
    return;
  }

  if (level.completed) {
    onLevelCompleteClick(x, y);
    return;
  }

  onBoardClick(x, y);
}

// ─── Fade helpers ────────────────────────────────────────

function fadeToShop(): void {
  startFadeOut(() => { enterShop(); }, 0.06);
}

function fadeToEvent(): void {
  startFadeOut(() => { screen = 'event'; }, 0.06);
}

function fadeToRestart(): void {
  startFadeOut(() => { startNewRun(); }, 0.06);
}

// ─── Game loop ───────────────────────────────────────────

function gameLoop(): void {
  const animating = updateAnimation();
  updateEffects();
  if (isFading() || hasActiveEffects() || animating || teleportChoices) {
    if (isFading()) updateFade();
    render();
  }
  requestAnimationFrame(gameLoop);
}

// ─── Init ────────────────────────────────────────────────

function init(): void {
  cc = initCanvas('game-canvas');
  screen = 'title';

  // Preload chess piece images
  preloadPieceImages();

  cc.canvas.addEventListener('click', onClick);

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isFading()) return;

    // Space or Enter = End Turn (during level, player turn)
    if ((e.code === 'Space' || e.code === 'Enter') && screen === 'level') {
      if (state.phase === 'player_turn' && !level.completed && !level.gameOver && !level.victory) {
        e.preventDefault();
        executeEnemyTurn();
      }
      return;
    }

    // Escape = deselect piece
    if (e.code === 'Escape' && screen === 'level') {
      clearSelection(selection);
      render();
      return;
    }
  });

  cc.canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (screen !== 'level') {
      cc.canvas.style.cursor = 'default';
      return;
    }
    const rect = cc.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pos = pixelToBoard(cc, x, y);

    if (pos) {
      const piece = state.pieces.find(
        (p: Piece) => p.position.row === pos.row && p.position.col === pos.col
      );
      if (piece && piece.owner === 'player' && state.phase === 'player_turn') {
        cc.canvas.style.cursor = 'pointer';
      } else if (selection.selectedPiece && selection.legalMoves.some(
        (m: Move) => m.to.row === pos.row && m.to.col === pos.col
      )) {
        cc.canvas.style.cursor = 'pointer';
      } else {
        cc.canvas.style.cursor = 'default';
      }
    } else {
      // Check if hovering over end turn button
      if (isInsideButton(getEndTurnButton(), x, y)) {
        cc.canvas.style.cursor = 'pointer';
      } else {
        cc.canvas.style.cursor = 'default';
      }
    }

    // Check artifact hover
    const prevHovered = hoveredArtifact;
    hoveredArtifact = null;
    for (const box of getArtifactHitBoxes()) {
      if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
        const art = level.artifactSlots.artifacts.find(a => a.id === box.artifactId);
        if (art) hoveredArtifact = art;
        break;
      }
    }
    if (hoveredArtifact !== prevHovered) render();
  });

  window.addEventListener('resize', () => { cc = resizeCanvas(cc); render(); });

  render();
  requestAnimationFrame(gameLoop);
}

init();
