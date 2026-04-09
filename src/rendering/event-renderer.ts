import { CanvasContext } from './canvas.js';
import { GameEvent } from '../systems/events.js';
import { BOARD_SIZE } from '../utils/types.js';
import { ButtonRect } from './ui-renderer.js';

let optionButtons: ButtonRect[] = [];

export function getEventOptionButtons(): readonly ButtonRect[] {
  return optionButtons;
}

export function drawEventScreen(cc: CanvasContext, event: GameEvent): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;
  const centerX = boardOriginX + boardPixels / 2;

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  // Event icon
  const iconY = boardOriginY + boardPixels * 0.15;
  const iconSize = Math.floor(squareSize * 0.7);
  ctx.fillStyle = '#2a2a4e';
  ctx.beginPath();
  ctx.arc(centerX, iconY, iconSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c040';
  ctx.font = `${Math.floor(iconSize)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', centerX, iconY);

  // Title
  const titleFont = Math.floor(squareSize * 0.4);
  ctx.fillStyle = '#e0e0e0';
  ctx.font = `bold ${titleFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const titleY = iconY + iconSize + 16;
  ctx.fillText(event.title, centerX, titleY);

  // Description
  const descFont = Math.floor(squareSize * 0.22);
  ctx.fillStyle = '#aaa';
  ctx.font = `${descFont}px sans-serif`;
  const descY = titleY + titleFont + 10;
  ctx.fillText(event.description, centerX, descY);

  // Option buttons
  const btnWidth = Math.floor(boardPixels * 0.7);
  const btnHeight = Math.floor(squareSize * 0.7);
  const btnGap = 10;
  const totalBtnHeight = event.options.length * (btnHeight + btnGap) - btnGap;
  const optionsStartY = descY + descFont + 24;

  optionButtons = [];

  for (let i = 0; i < event.options.length; i++) {
    const opt = event.options[i]!;
    const btnX = centerX - btnWidth / 2;
    const btnY = optionsStartY + i * (btnHeight + btnGap);

    optionButtons.push({ x: btnX, y: btnY, width: btnWidth, height: btnHeight });

    ctx.fillStyle = '#2a2a4e';
    ctx.strokeStyle = '#5a5a9e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Label
    const labelFont = Math.max(13, Math.floor(squareSize * 0.2));
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${labelFont}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.label, centerX, btnY + btnHeight * 0.35);

    // Description
    const optDescFont = Math.max(11, Math.floor(squareSize * 0.16));
    ctx.fillStyle = '#4adf4a';
    ctx.font = `${optDescFont}px sans-serif`;
    ctx.fillText(opt.description, centerX, btnY + btnHeight * 0.68);
  }
}
