import { CanvasContext } from './canvas.js';
import { ShopItem, MAX_ARMY_SLOTS } from '../systems/shop.js';
import { Economy } from '../systems/economy.js';
import { KingHP } from '../systems/king-hp.js';
import { ArtifactSlots } from '../core/artifact.js';
import { Piece, PieceType, PIECE_LABELS } from '../core/piece.js';
import { MAX_MODIFIER_SLOTS } from '../core/modifier.js';
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

export interface ModifierApplyState {
  modifierId: string;
  modifierName: string;
  pieceType: PieceType;
}

const GRID_ROWS = 2; // only show bottom 2 rows
const GRID_START_ROW = BOARD_SIZE - GRID_ROWS;

let shopCards: ShopCardRect[] = [];
let artifactRects: ShopCardRect[] = [];
let continueButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };
let cancelButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };
let gridOrigin = { x: 0, y: 0, cellSize: 0 };
let selectedPieceId: string | null = null;

export function getShopCards(): readonly ShopCardRect[] { return shopCards; }
export function getArtifactRects(): readonly ShopCardRect[] { return artifactRects; }
export function getContinueButton(): ButtonRect { return continueButton; }
export function getCancelButton(): ButtonRect { return cancelButton; }
export function getSelectedPieceId(): string | null { return selectedPieceId; }
export function setSelectedPieceId(id: string | null): void { selectedPieceId = id; }

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
  artifactSlots: ArtifactSlots,
  placement: PlacementState | null,
  modifierApply: ModifierApplyState | null,
): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;

  // Background with gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, cc.canvas.height);
  bgGrad.addColorStop(0, '#1a1a2e');
  bgGrad.addColorStop(1, '#0e0e1a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  // --- Title ---
  const centerX = boardOriginX + boardPixels / 2;
  const titleFont = Math.floor(squareSize * 0.45);
  ctx.fillStyle = '#f0c040';
  ctx.font = `bold ${titleFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Title with shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('SHOP', centerX + 2, boardOriginY + 2);
  ctx.fillStyle = '#f0c040';
  ctx.fillText('SHOP', centerX, boardOriginY);

  // --- Info bar (same as in-game HUD) ---
  const infoFont = Math.max(14, Math.floor(squareSize * 0.22));
  const infoY = boardOriginY + titleFont + 14;
  drawInfoBar(ctx, boardOriginX, infoY, boardPixels, infoFont, {
    kingHP,
    gold: economy.gold,
    armyCount: playerArmy.length,
    armySlots,
    artifactCount: artifactSlots.artifacts.length,
    artifactSlots: artifactSlots.maxSlots,
  });

  // --- Cards ---
  const cardsStartY = infoY + infoFont + 10;
  const cardWidth = Math.floor(boardPixels * 0.85);
  const cardHeight = Math.floor(squareSize * 0.85);
  const cardGap = 6;

  shopCards = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const cardX = boardOriginX + (boardPixels - cardWidth) / 2;
    const cardY = cardsStartY + i * (cardHeight + cardGap);
    // Check if item is usable
    let usable = true;
    if (item.type.kind === 'heal' && kingHP.current >= kingHP.max) usable = false;
    if (item.type.kind === 'army_slot' && armySlots >= MAX_ARMY_SLOTS) usable = false;
    if (item.type.kind === 'piece' && playerArmy.length >= armySlots) usable = false;
    if (item.type.kind === 'artifact' && artifactSlots.artifacts.length >= artifactSlots.maxSlots) usable = false;
    if (item.type.kind === 'modifier') {
      const mod = item.type.modifier;
      const canApplyToAny = playerArmy.some(
        p => p.type === mod.pieceType
          && p.modifiers.length < MAX_MODIFIER_SLOTS
          && !p.modifiers.some(m => m.id === mod.id),
      );
      if (!canApplyToAny) usable = false;
    }
    const canBuy = economy.gold >= item.cost && !placement && !modifierApply && usable;

    ctx.fillStyle = canBuy ? '#2a2a4e' : '#1e1e30';
    ctx.strokeStyle = canBuy ? '#5a5a9e' : '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 6);
    ctx.fill();
    ctx.stroke();

    shopCards.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight, index: i });

    // Category icon + Name (top-left) + cost (top-right)
    const nameFont = Math.max(12, Math.floor(squareSize * 0.19));
    const nameY = cardY + cardHeight * 0.35;

    // Icon based on item type
    let icon = '';
    let iconColor = '#888';
    switch (item.type.kind) {
      case 'piece':    icon = '\u265F'; iconColor = '#4a90d9'; break; // pawn symbol
      case 'modifier': icon = '\u2726'; iconColor = '#a855f7'; break; // diamond
      case 'artifact': icon = '\u2605'; iconColor = '#f0c040'; break; // star
      case 'heal':     icon = '\u2665'; iconColor = '#e55';    break; // heart
      case 'army_slot':icon = '\u2795'; iconColor = '#4a90d9'; break; // plus
      case 'extra_move':icon = '\u27A1'; iconColor = '#4adf4a'; break; // arrow
    }

    ctx.fillStyle = canBuy ? iconColor : '#444';
    ctx.font = `${nameFont}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cardX + 10, nameY);
    const iconW = ctx.measureText(icon).width + 6;

    ctx.fillStyle = canBuy ? '#fff' : '#666';
    ctx.font = `bold ${nameFont}px sans-serif`;
    ctx.fillText(item.name, cardX + 10 + iconW, nameY);

    ctx.fillStyle = canBuy ? '#f0c040' : '#665520';
    ctx.textAlign = 'right';
    ctx.fillText(`${item.cost}g`, cardX + cardWidth - 12, nameY);

    // Rarity dot (if artifact)
    if (item.rarity) {
      const RARITY_COLORS: Record<string, string> = { common: '#ccc', uncommon: '#4a9fd9', rare: '#a855f7', legendary: '#f0c040' };
      const dotColor = RARITY_COLORS[item.rarity] ?? '#ccc';
      ctx.beginPath();
      ctx.arc(cardX + cardWidth - 12 - ctx.measureText(`${item.cost}g`).width - 12, nameY, 4, 0, Math.PI * 2);
      ctx.fillStyle = canBuy ? dotColor : '#444';
      ctx.fill();
    }

    // Description (bottom row)
    const descFont = Math.max(10, Math.floor(squareSize * 0.14));
    const descY = cardY + cardHeight * 0.68;
    ctx.fillStyle = canBuy ? '#999' : '#555';
    ctx.font = `${descFont}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.description, cardX + 12, descY);
  }

  // --- Owned artifacts (compact 2-column grid) ---
  artifactRects = [];
  let afterCardsY = cardsStartY + items.length * (cardHeight + cardGap) + 4;

  if (artifactSlots.artifacts.length > 0) {
    const artFont = Math.max(10, Math.floor(squareSize * 0.14));
    const artH = artFont + 6;
    const cols = 2;
    const artGap = 4;
    const colWidth = Math.floor((boardPixels * 0.85 - artGap) / cols);
    const gridX = boardOriginX + (boardPixels - colWidth * cols - artGap) / 2;

    // Label
    ctx.fillStyle = '#666';
    ctx.font = `${artFont}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Artifacts (${artifactSlots.artifacts.length}/${artifactSlots.maxSlots}) — click to discard`, boardOriginX + 8, afterCardsY);
    afterCardsY += artFont + 3;

    const RARITY_COLORS: Record<string, string> = { common: '#ccc', uncommon: '#4a9fd9', rare: '#a855f7', legendary: '#f0c040' };

    for (let i = 0; i < artifactSlots.artifacts.length; i++) {
      const art = artifactSlots.artifacts[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ax = gridX + col * (colWidth + artGap);
      const ay = afterCardsY + row * (artH + 2);
      const rarCol = RARITY_COLORS[art.rarity] ?? '#ccc';

      ctx.fillStyle = '#1e1e30';
      ctx.beginPath();
      ctx.roundRect(ax, ay, colWidth, artH, 3);
      ctx.fill();

      artifactRects.push({ x: ax, y: ay, width: colWidth, height: artH, index: i });

      // Rarity dot + name
      ctx.beginPath();
      ctx.arc(ax + 8, ay + artH / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = rarCol;
      ctx.fill();

      ctx.fillStyle = rarCol;
      ctx.font = `bold ${artFont}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(art.name, ax + 16, ay + artH / 2);

      // X button
      ctx.fillStyle = '#555';
      ctx.textAlign = 'right';
      ctx.fillText('\u2715', ax + colWidth - 6, ay + artH / 2);
    }

    const totalRows = Math.ceil(artifactSlots.artifacts.length / cols);
    afterCardsY += totalRows * (artH + 2) + 2;
  }

  // --- Army grid (bottom 2 rows) ---
  const gridCellSize = Math.floor(squareSize * 0.7);
  const gridW = gridCellSize * BOARD_SIZE;
  const gridH = gridCellSize * GRID_ROWS;
  const gx = boardOriginX + (boardPixels - gridW) / 2;
  const gridLabelY = afterCardsY + 6;
  const gy = gridLabelY + 22;
  gridOrigin = { x: gx, y: gy, cellSize: gridCellSize };

  // Label
  const labelFont = Math.max(12, Math.floor(squareSize * 0.19));
  const isInteractive = placement || modifierApply;
  ctx.fillStyle = isInteractive ? '#7f7' : '#aaa';
  ctx.font = `bold ${labelFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  let gridLabel = 'Your Army';
  if (placement) gridLabel = `Click to place your ${placement.pieceType}`;
  else if (modifierApply) gridLabel = `Apply ${modifierApply.modifierName} to a piece`;
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

      // Highlight modifier-applicable pieces
      const piece = playerArmy.find(p => p.lockedPosition.row === boardRow && p.lockedPosition.col === col);
      if (
        modifierApply && piece
        && piece.type === modifierApply.pieceType
        && piece.modifiers.length < MAX_MODIFIER_SLOTS
        && !piece.modifiers.some(m => m.id === modifierApply!.modifierId)
      ) {
        ctx.fillStyle = 'rgba(160, 100, 255, 0.35)';
        ctx.fillRect(cx, cy, gridCellSize, gridCellSize);
      }

      // Draw piece
      if (piece) {
        const isSelected = piece.id === selectedPieceId;
        if (isSelected) {
          ctx.fillStyle = 'rgba(255, 255, 100, 0.4)';
          ctx.fillRect(cx, cy, gridCellSize, gridCellSize);
        }
        const pr = gridCellSize * 0.36;
        ctx.beginPath();
        ctx.arc(cx + gridCellSize / 2, cy + gridCellSize / 2, pr, 0, Math.PI * 2);
        ctx.fillStyle = '#4a90d9';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ff0' : '#222';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(gridCellSize * 0.38)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PIECE_LABELS[piece.type], cx + gridCellSize / 2, cy + gridCellSize / 2);

        // Modifier count indicator
        if (piece.modifiers.length > 0) {
          const dotR = gridCellSize * 0.1;
          const dotX = cx + gridCellSize - dotR - 2;
          const dotY = cy + gridCellSize - dotR - 2;
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
          ctx.fillStyle = '#a855f7';
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(dotR * 1.4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${piece.modifiers.length}`, dotX, dotY);
        }
      }
    }
  }

  // Grid border
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(gx, gy, gridW, gridH);

  // --- Selected piece info panel ---
  const selPiece = selectedPieceId ? playerArmy.find(p => p.id === selectedPieceId) : null;
  let panelBottomY = gy + gridH;
  if (selPiece && !placement && !modifierApply) {
    const panelY = gy + gridH + 4;
    const panelFont = Math.max(11, Math.floor(squareSize * 0.16));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Piece name
    ctx.fillStyle = '#4a90d9';
    ctx.font = `bold ${panelFont}px sans-serif`;
    const pieceName = selPiece.type.charAt(0).toUpperCase() + selPiece.type.slice(1);
    ctx.fillText(pieceName, gx, panelY);

    // Filter out artifact-granted modifiers for display
    const playerMods = selPiece.modifiers.filter(m => !m.id.startsWith('artifact_'));

    if (playerMods.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = `${panelFont}px sans-serif`;
      ctx.fillText('No modifiers', gx, panelY + panelFont + 4);
      panelBottomY = panelY + panelFont * 2 + 8;
    } else {
      let my = panelY + panelFont + 4;
      for (const mod of playerMods) {
        ctx.fillStyle = '#a855f7';
        ctx.font = `bold ${panelFont}px sans-serif`;
        ctx.fillText(`\u2726 ${mod.name}`, gx, my);
        ctx.fillStyle = '#888';
        ctx.font = `${Math.floor(panelFont * 0.85)}px sans-serif`;
        ctx.fillText(` - ${mod.description}`, gx + ctx.measureText(`\u2726 ${mod.name}`).width + 4, my);
        my += panelFont + 3;
      }
      panelBottomY = my;
    }

    const slotText = `Modifier slots: ${playerMods.length}/${MAX_MODIFIER_SLOTS}`;
    ctx.fillStyle = '#666';
    ctx.font = `${Math.floor(panelFont * 0.85)}px sans-serif`;
    ctx.fillText(slotText, gx + gridW - ctx.measureText(slotText).width, gy + gridH + 4);
  }

  // --- Continue button (only if not placing/applying) ---
  if (!placement && !modifierApply) {
    const btnWidth = squareSize * 2.5;
    const btnHeight = 38;
    const btnX = boardOriginX + (boardPixels - btnWidth) / 2;
    const btnY = panelBottomY + 10;

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
