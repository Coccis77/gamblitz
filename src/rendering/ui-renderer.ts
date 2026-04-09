import { GameState } from '../core/game.js';
import { LevelState } from '../systems/level.js';
import { Economy } from '../systems/economy.js';
import { Piece } from '../core/piece.js';
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
  artifactCount: number;
  artifactSlots: number;
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

  // Artifacts
  if (data.artifactSlots > 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('  |  ', cx, y);
    cx += ctx.measureText('  |  ').width;

    ctx.fillStyle = '#a855f7';
    const artStr = `\u2726${data.artifactCount}/${data.artifactSlots}`;
    ctx.fillText(artStr, cx, y);
    cx += ctx.measureText(artStr).width;
  }

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

export function drawHUD(cc: CanvasContext, state: GameState, level: LevelState, economy: Economy, rank?: number, selectedPiece?: Piece | null): void {
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
    `${rank ? `R${rank} ` : ''}${level.template.levelType.toUpperCase()}: ${level.template.name}  |  Turn ${state.turnNumber}  |  ${state.phase === 'player_turn' ? 'YOUR TURN' : 'ENEMY TURN'}`,
    boardOriginX, row1Y,
  );

  // --- Row 2: shared info bar ---
  const row2Y = boardOriginY - 6;
  drawInfoBar(ctx, boardOriginX, row2Y, boardRight - boardOriginX, fontSize, {
    kingHP: level.playerKingHP,
    gold: economy.gold,
    armyCount: level.playerArmy.length,
    armySlots: level.armySlots,
    artifactCount: level.artifactSlots.artifacts.length,
    artifactSlots: level.artifactSlots.maxSlots,
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
    boardBottom + 6,
  );

  // Second bottom line: selected piece modifiers OR owned artifacts
  const line2Font = Math.max(11, Math.floor(squareSize * 0.16));
  const line2Y = boardBottom + 6 + smallFont + 4;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (selectedPiece) {
    const pieceName = selectedPiece.type.charAt(0).toUpperCase() + selectedPiece.type.slice(1);
    const playerMods = selectedPiece.modifiers.filter(m => !m.id.startsWith('artifact_'));

    ctx.font = `bold ${line2Font}px sans-serif`;
    ctx.fillStyle = '#4a90d9';

    if (playerMods.length > 0) {
      const modStr = playerMods.map(m => m.name).join(', ');
      ctx.fillText(`${pieceName}: `, boardOriginX, line2Y);
      const labelW = ctx.measureText(`${pieceName}: `).width;
      ctx.fillStyle = '#a855f7';
      ctx.font = `${line2Font}px sans-serif`;
      ctx.fillText(modStr, boardOriginX + labelW, line2Y);
    } else {
      ctx.fillText(`${pieceName}: no modifiers`, boardOriginX, line2Y);
    }
  } else if (level.artifactSlots.artifacts.length > 0) {
    const RARITY_COLORS: Record<string, string> = { common: '#ccc', uncommon: '#4a9fd9', rare: '#a855f7', legendary: '#f0c040' };
    ctx.font = `${line2Font}px sans-serif`;
    let ax = boardOriginX;
    for (const art of level.artifactSlots.artifacts) {
      const col = RARITY_COLORS[art.rarity] ?? '#ccc';
      ctx.fillStyle = col;
      const txt = `\u2726${art.name}`;
      ctx.fillText(txt, ax, line2Y);
      ax += ctx.measureText(txt).width + 10;
      if (ax > boardRight - 20) break;
    }
  }

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

export interface RunStats {
  rank: number;
  levelsCleared: number;
  totalCaptures: number;
  totalGoldEarned: number;
  seed?: number;
}

export function drawGameOver(cc: CanvasContext, stats?: RunStats): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;
  const centerX = boardOriginX + boardPixels / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(boardOriginX, boardOriginY, boardPixels, boardPixels);

  const bigFont = Math.floor(squareSize * 0.5);
  ctx.fillStyle = '#e55';
  ctx.font = `bold ${bigFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', centerX, boardOriginY + boardPixels * 0.25);

  // Stats
  if (stats) {
    const statFont = Math.floor(squareSize * 0.22);
    ctx.font = `${statFont}px sans-serif`;
    ctx.fillStyle = '#ccc';
    const startY = boardOriginY + boardPixels * 0.38;
    const lineH = statFont + 8;
    ctx.fillText(`Rank reached: ${stats.rank}`, centerX, startY);
    ctx.fillText(`Levels cleared: ${stats.levelsCleared}`, centerX, startY + lineH);
    ctx.fillText(`Pieces captured: ${stats.totalCaptures}`, centerX, startY + lineH * 2);
    ctx.fillText(`Gold earned: ${stats.totalGoldEarned}`, centerX, startY + lineH * 3);
    if (stats.seed !== undefined) {
      ctx.fillStyle = '#888';
      ctx.font = `${Math.floor(statFont * 0.8)}px sans-serif`;
      ctx.fillText(`Seed: ${stats.seed}`, centerX, startY + lineH * 4 + 4);
    }
  }

  // Restart button
  const btnWidth = squareSize * 2.5;
  const btnHeight = 44;
  const btnX = centerX - btnWidth / 2;
  const btnY = boardOriginY + boardPixels * 0.72;

  restartButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

  ctx.fillStyle = '#4a90d9';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.25)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Restart', btnX + btnWidth / 2, btnY + btnHeight / 2);
}

export function isInsideButton(btn: ButtonRect, x: number, y: number): boolean {
  return x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
}
