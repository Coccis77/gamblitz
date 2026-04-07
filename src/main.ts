import { initCanvas, resizeCanvas, CanvasContext, pixelToBoard } from './rendering/canvas.js';
import { drawBoard } from './rendering/board-renderer.js';
import { drawPieces } from './rendering/piece-renderer.js';
import { drawIntents } from './rendering/intent-renderer.js';
import {
  drawHUD, drawLevelComplete, drawGameOver,
  getEndTurnButton, getNextLevelButton, getRestartButton, isInsideButton,
  ButtonRect,
} from './rendering/ui-renderer.js';
import { drawShop, getShopCards, getContinueButton, getCancelButton, shopGridHitTest, PlacementState } from './rendering/shop-renderer.js';
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
import { handleKingHit, damageKing } from './systems/king-hp.js';
import { createRng, RngFn } from './utils/rng.js';
import {
  LevelState, createLevel, buildGameStateForLevel, checkLevelComplete,
  onPieceCaptured, onTurnEnd, checkEnemyPawnPromotion,
} from './systems/level.js';
import {
  Economy, createEconomy, earnGold, spendGold,
  GOLD_PER_CAPTURE, GOLD_LEVEL_COMPLETE, GOLD_BOSS_COMPLETE,
} from './systems/economy.js';
import { ShopItem, generateShopItems, MAX_ARMY_SLOTS } from './systems/shop.js';
import { BOARD_SIZE } from './utils/types.js';

type Screen = 'level' | 'shop';

let cc: CanvasContext;
let state: GameState;
let selection: SelectionState;
let level: LevelState;
let rng: RngFn;
let economy: Economy;
let screen: Screen = 'level';
let shopItems: ShopItem[] = [];
let placement: PlacementState | null = null;
let pendingPlacementCost = 0;

// ─── Level management ────────────────────────────────────

function startLevel(levelNumber: number, resetAll?: boolean): void {
  if (resetAll) {
    rng = createRng(Date.now());
    economy = createEconomy();
  }
  const persisted = !resetAll && level
    ? { playerKingHP: level.playerKingHP, playerArmy: level.playerArmy, armySlots: level.armySlots }
    : undefined;
  level = createLevel(levelNumber, persisted);
  state = buildGameStateForLevel(level);
  selection = createSelectionState();
  screen = 'level';
}

function enterShop(): void {
  shopItems = generateShopItems(rng, level.armySlots);
  placement = null;
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

function buyItem(item: ShopItem): void {
  if (placement) return;
  if (!spendGold(economy, item.cost)) return;

  switch (item.type.kind) {
    case 'piece': {
      const { empty, replaceable } = getPlacementInfo(level.playerArmy, item.type.pieceType);
      const canPlaceEmpty = level.playerArmy.length < level.armySlots && empty.length > 0;
      const validSquares = canPlaceEmpty ? empty : [];
      if (validSquares.length === 0 && replaceable.length === 0) {
        earnGold(economy, item.cost);
        return;
      }
      placement = { pieceType: item.type.pieceType, validSquares, replaceableSquares: replaceable };
      pendingPlacementCost = item.cost;
      break;
    }
    case 'heal': {
      const hp = level.playerKingHP;
      if (hp.current < hp.max) {
        hp.current = Math.min(hp.max, hp.current + item.type.amount);
      } else {
        earnGold(economy, item.cost); // refund — already full
      }
      break;
    }
    case 'extra_move': {
      level.extraMoves = (level.extraMoves ?? 0) + 1;
      break;
    }
    case 'army_slot': {
      if (level.armySlots < MAX_ARMY_SLOTS) {
        level.armySlots++;
      } else {
        earnGold(economy, item.cost); // refund — already max
      }
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
        }

        const survived = handleKingHit(target, hp, state.pieces, rng);
        if (!survived) {
          if (target.owner === 'player') {
            level.gameOver = true;
          } else {
            level.progress.enemyKingDefeated = true;
          }
        }

        onPieceCaptured(level);
        earnGold(economy, GOLD_PER_CAPTURE);
        return !level.gameOver;
      }
    }
  }

  const hadCapture = !!move.capturedPieceId;
  executeMove(move, state.pieces);
  if (hadCapture) {
    onPieceCaptured(level);
    earnGold(economy, GOLD_PER_CAPTURE);
  }
  return true;
}

// ─── Render ──────────────────────────────────────────────

function render(): void {
  cc.ctx.clearRect(0, 0, cc.canvas.width, cc.canvas.height);

  if (screen === 'shop') {
    drawShop(cc, shopItems, economy, level.playerArmy, level.armySlots, level.playerKingHP, placement);
    return;
  }

  drawBoard(cc, selection.selectedPiece?.position ?? null, selection.legalMoves);
  drawIntents(cc, state.enemyIntents, state.pieces);
  drawPieces(cc, state.pieces);
  drawHUD(cc, state, level, economy);

  if (level.gameOver) drawGameOver(cc);
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
        placement = null;
        pendingPlacementCost = 0;
      } else if (isReplace) {
        const idx = level.playerArmy.findIndex(
          p => p.lockedPosition.row === pos.row && p.lockedPosition.col === pos.col,
        );
        if (idx !== -1) level.playerArmy.splice(idx, 1);
        level.playerArmy.push(createPiece(placement.pieceType, 'player', pos));
        placement = null;
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
      if (item) buyItem(item);
      render();
      return;
    }
  }

  // Continue button
  if (isInsideButton(getContinueButton(), x, y)) {
    const extraMoves = level.extraMoves ?? 0;
    startLevel(level.levelNumber + 1);
    if (extraMoves) {
      state.maxMovesPerTurn += extraMoves;
      state.movesRemaining = state.maxMovesPerTurn;
    }
    render();
  }
}

function onClick(e: MouseEvent): void {
  const rect = cc.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (screen === 'shop') {
    onShopClick(x, y);
    return;
  }

  if (level.gameOver) {
    if (isInsideButton(getRestartButton(), x, y)) { startLevel(1, true); render(); }
    return;
  }

  if (level.completed) {
    if (isInsideButton(getNextLevelButton(), x, y)) {
      // Award gold for completing the level
      const bonus = level.template.isBoss ? GOLD_BOSS_COMPLETE : GOLD_LEVEL_COMPLETE;
      earnGold(economy, bonus);
      enterShop();
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
  startLevel(1);

  cc.canvas.addEventListener('click', onClick);
  window.addEventListener('resize', () => { cc = resizeCanvas(cc); render(); });

  render();
}

init();
