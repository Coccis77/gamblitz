import { CanvasContext } from './canvas.js';
import { ArtifactDef, RARITY_COLORS } from '../core/artifact.js';
import { BOARD_SIZE } from '../utils/types.js';
import { ButtonRect } from './ui-renderer.js';

let draftButtons: ButtonRect[] = [];

export function getDraftButtons(): readonly ButtonRect[] {
  return draftButtons;
}

export function drawDraftScreen(cc: CanvasContext, artifacts: readonly ArtifactDef[]): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;
  const centerX = boardOriginX + boardPixels / 2;

  // Background
  const bgGrad = ctx.createRadialGradient(centerX, boardOriginY + boardPixels * 0.4, 0, centerX, boardOriginY + boardPixels * 0.4, boardPixels);
  bgGrad.addColorStop(0, '#1e1e36');
  bgGrad.addColorStop(1, '#0a0a14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  // Glow
  const glow = ctx.createRadialGradient(centerX, boardOriginY + boardPixels * 0.25, 0, centerX, boardOriginY + boardPixels * 0.25, squareSize * 3);
  glow.addColorStop(0, 'rgba(168, 85, 247, 0.1)');
  glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  if (artifacts.length === 0) return;

  // Title
  const titleFont = Math.floor(squareSize * 0.42);
  ctx.fillStyle = '#a855f7';
  ctx.font = `bold ${titleFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Choose a Starting Artifact', centerX, boardOriginY + 20);

  // Subtitle
  const subFont = Math.floor(squareSize * 0.2);
  ctx.fillStyle = '#888';
  ctx.font = `${subFont}px sans-serif`;
  ctx.fillText('Pick one to begin your run', centerX, boardOriginY + 20 + titleFont + 8);

  // Cards
  const cardWidth = Math.floor(boardPixels * 0.4);
  const cardHeight = Math.floor(squareSize * 2.5);
  const gap = Math.floor(boardPixels * 0.06);
  const totalW = artifacts.length * cardWidth + (artifacts.length - 1) * gap;
  const startX = centerX - totalW / 2;
  const cardY = boardOriginY + 20 + titleFont + subFont + 30;

  draftButtons = [];

  for (let i = 0; i < artifacts.length; i++) {
    const art = artifacts[i]!;
    const cardX = startX + i * (cardWidth + gap);
    const rarCol = RARITY_COLORS[art.rarity];

    draftButtons.push({ x: cardX, y: cardY, width: cardWidth, height: cardHeight });

    // Card background
    ctx.fillStyle = '#1e1e30';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 10);
    ctx.fill();

    // Card border
    ctx.strokeStyle = rarCol;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Star icon
    const iconSize = Math.floor(squareSize * 0.5);
    ctx.fillStyle = rarCol;
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2605', cardX + cardWidth / 2, cardY + cardHeight * 0.2);

    // Name
    const nameFont = Math.max(13, Math.floor(squareSize * 0.22));
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${nameFont}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(art.name, cardX + cardWidth / 2, cardY + cardHeight * 0.38);

    // Rarity label
    const rarFont = Math.max(10, Math.floor(squareSize * 0.15));
    ctx.fillStyle = rarCol;
    ctx.font = `${rarFont}px sans-serif`;
    ctx.fillText(art.rarity.toUpperCase(), cardX + cardWidth / 2, cardY + cardHeight * 0.48);

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 15, cardY + cardHeight * 0.54);
    ctx.lineTo(cardX + cardWidth - 15, cardY + cardHeight * 0.54);
    ctx.stroke();

    // Description (word wrap)
    const descFont = Math.max(11, Math.floor(squareSize * 0.16));
    ctx.fillStyle = '#aaa';
    ctx.font = `${descFont}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const words = art.description.split(' ');
    const maxW = cardWidth - 24;
    let line = '';
    let lineY = cardY + cardHeight * 0.58;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cardX + cardWidth / 2, lineY);
        line = word;
        lineY += descFont + 4;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cardX + cardWidth / 2, lineY);
  }
}
