import { CanvasContext } from './canvas.js';
import { ShopItem, MAX_ARMY_SLOTS } from '../systems/shop.js';
import { Economy } from '../systems/economy.js';
import { KingHP } from '../systems/king-hp.js';
import { Piece, PieceType, PIECE_LABELS } from '../core/piece.js';
import { Position, BOARD_SIZE } from '../utils/types.js';
import { ButtonRect, drawInfoBar } from './ui-renderer.js';
import { getSquareColor } from '../core/board.js';

export interface ShopCardRect extends ButtonRect {
  index: number;
}

export interface PlacementState {
  pieceType: PieceType;
  validSquares: Position[];
  replaceableSquares: Position[];
}

const GRID_ROWS = 2; // only show bottom 2 rows
const GRID_START_ROW = BOARD_SIZE - GRID_ROWS;

let shopCards: ShopCardRect[] = [];
let continueButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };
let cancelButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };
let gridOrigin = { x: 0, y: 0, cellSize: 0 };

export function getShopCards(): readonly ShopCardRect[] { return shopCards; }
export function getContinueButton(): ButtonRect { return continueButton; }
export function getCancelButton(): ButtonRect { return cancelButton; }

/** Convert pixel coords to a board position on the army grid, or null. */
export function shopGridHitTest(px: number, py: number): Position | null {
  const { x, y, cellSize } = gridOrigin;
  if (cellSize === 0) return null;
  const col = Math.floor((px - x) / cellSize);
  const gridRow = Math.floor((py - y) / cellSize);
  if (gridRow < 0 || gridRow >= GRID_ROWS || col < 0 || col >= BOARD_SIZE) return null;
  return { row: GRID_START_ROW + gridRow, col };
}

export function drawShop(
  cc: CanvasContext,
  items: readonly ShopItem[],
  economy: Economy,
  playerArmy: readonly Piece[],
  armySlots: number,
  kingHP: KingHP,
  placement: PlacementState | null,
): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  // --- Title ---
  const centerX = boardOriginX + boardPixels / 2;
  const titleFont = Math.floor(squareSize * 0.45);
  ctx.fillStyle = '#e0e0e0';
  ctx.font = `bold ${titleFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SHOP', centerX, boardOriginY);

  // --- Info bar (same as in-game HUD) ---
  const infoFont = Math.max(14, Math.floor(squareSize * 0.22));
  const infoY = boardOriginY + titleFont + 14;
  drawInfoBar(ctx, boardOriginX, infoY, boardPixels, infoFont, {
    kingHP,
    gold: economy.gold,
    armyCount: playerArmy.length,
    armySlots,
  });

  // --- Cards ---
  const cardsStartY = infoY + infoFont + 10;
  const cardWidth = Math.floor(boardPixels * 0.85);
  const cardHeight = Math.floor(squareSize * 0.65);
  const cardGap = 8;

  shopCards = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const cardX = boardOriginX + (boardPixels - cardWidth) / 2;
    const cardY = cardsStartY + i * (cardHeight + cardGap);
    // Check if item is usable
    let usable = true;
    if (item.type.kind === 'heal' && kingHP.current >= kingHP.max) usable = false;
    if (item.type.kind === 'army_slot' && armySlots >= MAX_ARMY_SLOTS) usable = false;
    const canBuy = economy.gold >= item.cost && !placement && usable;

    ctx.fillStyle = canBuy ? '#2a2a4e' : '#1e1e30';
    ctx.strokeStyle = canBuy ? '#5a5a9e' : '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 6);
    ctx.fill();
    ctx.stroke();

    shopCards.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight, index: i });

    const nameFont = Math.max(12, Math.floor(squareSize * 0.19));
    ctx.fillStyle = canBuy ? '#fff' : '#666';
    ctx.font = `bold ${nameFont}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name, cardX + 12, cardY + cardHeight / 2);

    // Description (middle)
    const descFont = Math.max(10, Math.floor(squareSize * 0.14));
    ctx.fillStyle = canBuy ? '#999' : '#555';
    ctx.font = `${descFont}px sans-serif`;
    const nameWidth = ctx.measureText(item.name).width;
    ctx.font = `bold ${nameFont}px sans-serif`;
    ctx.font = `${descFont}px sans-serif`;
    ctx.fillText(` - ${item.description}`, cardX + 12 + nameWidth + 4, cardY + cardHeight / 2);

    // Cost (right)
    ctx.fillStyle = canBuy ? '#f0c040' : '#665520';
    ctx.font = `bold ${nameFont}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${item.cost}g`, cardX + cardWidth - 12, cardY + cardHeight / 2);
  }

  // --- Army grid (bottom 2 rows) ---
  const gridCellSize = Math.floor(squareSize * 0.7);
  const gridW = gridCellSize * BOARD_SIZE;
  const gridH = gridCellSize * GRID_ROWS;
  const gx = boardOriginX + (boardPixels - gridW) / 2;
  const gridLabelY = cardsStartY + items.length * (cardHeight + cardGap) + 12;
  const gy = gridLabelY + 22;
  gridOrigin = { x: gx, y: gy, cellSize: gridCellSize };

  // Label
  const labelFont = Math.max(12, Math.floor(squareSize * 0.19));
  ctx.fillStyle = placement ? '#7f7' : '#aaa';
  ctx.font = `bold ${labelFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const gridLabel = placement ? `Click to place your ${placement.pieceType}` : 'Your Army';
  ctx.fillText(gridLabel, gx + gridW / 2, gy - 4);

  // Draw grid
  for (let gr = 0; gr < GRID_ROWS; gr++) {
    const boardRow = GRID_START_ROW + gr;
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cx = gx + col * gridCellSize;
      const cy = gy + gr * gridCellSize;
      const color = getSquareColor({ row: boardRow, col });
      ctx.fillStyle = color === 'light' ? '#c0a878' : '#8a6840';
      ctx.fillRect(cx, cy, gridCellSize, gridCellSize);

      // Highlight valid placement / replaceable squares
      if (placement) {
        const isEmpty = placement.validSquares.some(s => s.row === boardRow && s.col === col);
        const isReplace = placement.replaceableSquares.some(s => s.row === boardRow && s.col === col);
        if (isEmpty) {
          ctx.fillStyle = 'rgba(100, 255, 100, 0.35)';
          ctx.fillRect(cx, cy, gridCellSize, gridCellSize);
        } else if (isReplace) {
          ctx.fillStyle = 'rgba(255, 180, 50, 0.35)';
          ctx.fillRect(cx, cy, gridCellSize, gridCellSize);
        }
      }

      // Draw piece at its locked position
      const piece = playerArmy.find(p => p.lockedPosition.row === boardRow && p.lockedPosition.col === col);
      if (piece) {
        const pr = gridCellSize * 0.36;
        ctx.beginPath();
        ctx.arc(cx + gridCellSize / 2, cy + gridCellSize / 2, pr, 0, Math.PI * 2);
        ctx.fillStyle = '#4a90d9';
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(gridCellSize * 0.38)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PIECE_LABELS[piece.type], cx + gridCellSize / 2, cy + gridCellSize / 2);
      }
    }
  }

  // Grid border
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(gx, gy, gridW, gridH);

  // --- Continue button (only if not placing) ---
  if (!placement) {
    const btnWidth = squareSize * 2.5;
    const btnHeight = 38;
    const btnX = boardOriginX + (boardPixels - btnWidth) / 2;
    const btnY = gy + gridH + 14;

    continueButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

    ctx.fillStyle = '#4a90d9';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(13, Math.floor(squareSize * 0.2))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Continue', btnX + btnWidth / 2, btnY + btnHeight / 2);
  } else {
    continueButton = { x: 0, y: 0, width: 0, height: 0 };

    // Cancel button during placement
    const btnWidth = squareSize * 2.5;
    const btnHeight = 38;
    const btnX = boardOriginX + (boardPixels - btnWidth) / 2;
    const btnY = gy + gridH + 14;

    cancelButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

    ctx.fillStyle = '#a33';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(13, Math.floor(squareSize * 0.2))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Cancel', btnX + btnWidth / 2, btnY + btnHeight / 2);
  }
}
