import { GameState } from '../core/game.js';
import { LevelState } from '../systems/level.js';
import { Economy } from '../systems/economy.js';
import { CanvasContext } from './canvas.js';
import { BOARD_SIZE } from '../utils/types.js';
import { KingHP } from '../systems/king-hp.js';

export interface ButtonRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

let endTurnButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };
let nextLevelButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };
let restartButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };

export function getEndTurnButton(): ButtonRect { return endTurnButton; }
export function getNextLevelButton(): ButtonRect { return nextLevelButton; }
export function getRestartButton(): ButtonRect { return restartButton; }

// ─── Shared info bar ────────────────────────────────────

export interface InfoBarData {
  kingHP: KingHP;
  gold: number;
  armyCount: number;
  armySlots: number;
  bossHP?: KingHP | null;
}

/**
 * Draw the shared info bar: King ♥♥♥ | 5g | Army 6/9 | Boss ♥♥♥
 * Returns the height consumed.
 */
export function drawInfoBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  data: InfoBarData,
): number {
  const heartSize = fontSize;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let cx = x;

  // King label
  ctx.fillStyle = '#aaa';
  ctx.fillText('King ', cx, y);
  cx += ctx.measureText('King ').width;

  // King hearts
  for (let i = 0; i < data.kingHP.max; i++) {
    ctx.fillStyle = i < data.kingHP.current ? '#4a90d9' : '#444';
    ctx.fillText('\u2665', cx, y);
    cx += ctx.measureText('\u2665').width + 2;
  }

  // Separator + Gold
  ctx.fillStyle = '#666';
  ctx.fillText('  |  ', cx, y);
  cx += ctx.measureText('  |  ').width;

  ctx.fillStyle = '#f0c040';
  const goldStr = `${data.gold}g`;
  ctx.fillText(goldStr, cx, y);
  cx += ctx.measureText(goldStr).width;

  // Separator + Army
  ctx.fillStyle = '#666';
  ctx.fillText('  |  ', cx, y);
  cx += ctx.measureText('  |  ').width;

  ctx.fillStyle = '#aaa';
  const armyStr = `Army ${data.armyCount}/${data.armySlots}`;
  ctx.fillText(armyStr, cx, y);
  cx += ctx.measureText(armyStr).width;

  // Boss HP (if present)
  if (data.bossHP) {
    ctx.fillStyle = '#666';
    ctx.fillText('  |  ', cx, y);
    cx += ctx.measureText('  |  ').width;

    ctx.fillStyle = '#aaa';
    ctx.fillText('Boss ', cx, y);
    cx += ctx.measureText('Boss ').width;

    for (let i = 0; i < data.bossHP.max; i++) {
      ctx.fillStyle = i < data.bossHP.current ? '#d94a4a' : '#444';
      ctx.fillText('\u2665', cx, y);
      cx += ctx.measureText('\u2665').width + 2;
    }
  }

  return fontSize + 4;
}

// ─── Game HUD ────────────────────────────────────────────

export function drawHUD(cc: CanvasContext, state: GameState, level: LevelState, economy: Economy): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardBottom = boardOriginY + squareSize * BOARD_SIZE;
  const boardRight = boardOriginX + squareSize * BOARD_SIZE;
  const fontSize = Math.max(14, Math.floor(squareSize * 0.22));

  // --- Row 1: level + turn ---
  ctx.fillStyle = '#e0e0e0';
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';

  const row1Y = boardOriginY - 26;
  ctx.fillText(
    `Lv.${level.levelNumber} ${level.template.name}  |  Turn ${state.turnNumber}  |  ${state.phase === 'player_turn' ? 'YOUR TURN' : 'ENEMY TURN'}`,
    boardOriginX, row1Y,
  );

  // --- Row 2: shared info bar ---
  const row2Y = boardOriginY - 6;
  drawInfoBar(ctx, boardOriginX, row2Y, boardRight - boardOriginX, fontSize, {
    kingHP: level.playerKingHP,
    gold: economy.gold,
    armyCount: level.playerArmy.length,
    armySlots: level.armySlots,
    bossHP: level.enemyKingHP,
  });

  // --- Bottom bar: objective + moves + end turn ---
  const smallFont = Math.max(12, Math.floor(squareSize * 0.18));
  ctx.fillStyle = '#ccc';
  ctx.font = `${smallFont}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `Objective: ${level.objective.description}  |  Moves: ${state.movesRemaining}/${state.maxMovesPerTurn}`,
    boardOriginX,
    boardBottom + 12,
  );

  // End Turn button
  const btnWidth = squareSize * 2;
  const btnHeight = 36;
  const btnX = boardRight - btnWidth;
  const btnY = boardBottom + 8;

  endTurnButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

  const isActive = state.phase === 'player_turn' && !level.completed && !level.gameOver;
  ctx.fillStyle = isActive ? '#4a90d9' : '#555';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(14, Math.floor(squareSize * 0.2))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('End Turn', btnX + btnWidth / 2, btnY + btnHeight / 2);
}

// ─── Overlays ────────────────────────────────────────────

function drawOverlay(
  cc: CanvasContext,
  title: string,
  titleColor: string,
  btnLabel: string,
  outBtn: 'next' | 'restart',
): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(boardOriginX, boardOriginY, boardPixels, boardPixels);

  const bigFont = Math.floor(squareSize * 0.5);
  ctx.fillStyle = titleColor;
  ctx.font = `bold ${bigFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, boardOriginX + boardPixels / 2, boardOriginY + boardPixels / 2 - 30);

  const btnWidth = squareSize * 2.5;
  const btnHeight = 44;
  const btnX = boardOriginX + (boardPixels - btnWidth) / 2;
  const btnY = boardOriginY + boardPixels / 2 + 20;

  const rect = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };
  if (outBtn === 'next') nextLevelButton = rect;
  else restartButton = rect;

  ctx.fillStyle = '#4a90d9';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.25)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btnLabel, btnX + btnWidth / 2, btnY + btnHeight / 2);
}

export function drawLevelComplete(cc: CanvasContext): void {
  drawOverlay(cc, 'LEVEL COMPLETE', '#4adf4a', 'Next Level', 'next');
}

export function drawGameOver(cc: CanvasContext): void {
  drawOverlay(cc, 'GAME OVER', '#e55', 'Restart', 'restart');
}

export function isInsideButton(btn: ButtonRect, x: number, y: number): boolean {
  return x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
}
