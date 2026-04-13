import { CanvasContext } from './canvas.js';
import { BOARD_SIZE } from '../utils/types.js';
import { ButtonRect } from './ui-renderer.js';

let startButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };

export function getTitleStartButton(): ButtonRect {
  return startButton;
}

export function drawTitleScreen(cc: CanvasContext): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;
  const centerX = boardOriginX + boardPixels / 2;
  const centerY = boardOriginY + boardPixels / 2;

  // Background gradient
  const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, boardPixels);
  bgGrad.addColorStop(0, '#1e1e36');
  bgGrad.addColorStop(1, '#0a0a14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  // Decorative chess pieces silhouettes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.font = `${Math.floor(squareSize * 2.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u265A', centerX - squareSize * 1.5, centerY - squareSize * 0.5);
  ctx.fillText('\u265B', centerX + squareSize * 1.5, centerY - squareSize * 0.5);

  // Title glow
  const glowGrad = ctx.createRadialGradient(centerX, centerY - squareSize * 0.8, 0, centerX, centerY - squareSize * 0.8, squareSize * 3);
  glowGrad.addColorStop(0, 'rgba(240, 192, 64, 0.12)');
  glowGrad.addColorStop(1, 'rgba(240, 192, 64, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  // Title shadow
  const titleFont = Math.floor(squareSize * 1.0);
  ctx.font = `bold ${titleFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillText('GAMBLITZ', centerX + 3, centerY - squareSize * 0.7 + 3);

  // Title
  const titleGrad = ctx.createLinearGradient(centerX - squareSize * 2, 0, centerX + squareSize * 2, 0);
  titleGrad.addColorStop(0, '#f0c040');
  titleGrad.addColorStop(0.5, '#ffe080');
  titleGrad.addColorStop(1, '#f0c040');
  ctx.fillStyle = titleGrad;
  ctx.fillText('GAMBLITZ', centerX, centerY - squareSize * 0.7);

  // Subtitle
  const subFont = Math.floor(squareSize * 0.25);
  ctx.fillStyle = '#8888aa';
  ctx.font = `${subFont}px sans-serif`;
  ctx.fillText('A roguelike chess game', centerX, centerY - squareSize * 0.1);

  // Chess piece decorations
  const decoFont = Math.floor(squareSize * 0.4);
  ctx.font = `${decoFont}px sans-serif`;
  ctx.fillStyle = 'rgba(200, 200, 220, 0.2)';
  const pieces = ['\u2654', '\u2655', '\u2656', '\u2657', '\u2658', '\u2659'];
  const decoY = centerY + squareSize * 0.4;
  const totalW = pieces.length * decoFont;
  for (let i = 0; i < pieces.length; i++) {
    ctx.fillText(pieces[i]!, centerX - totalW / 2 + decoFont * 0.5 + i * decoFont, decoY);
  }

  // Start button
  const btnWidth = squareSize * 3;
  const btnHeight = Math.floor(squareSize * 0.6);
  const btnX = centerX - btnWidth / 2;
  const btnY = centerY + squareSize * 1.2;

  startButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

  // Button shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(btnX + 2, btnY + 2, btnWidth, btnHeight, 8);
  ctx.fill();

  // Button
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
  btnGrad.addColorStop(0, '#5a9ae0');
  btnGrad.addColorStop(1, '#3a70b0');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 8);
  ctx.fill();

  // Button border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Start Game', btnX + btnWidth / 2, btnY + btnHeight / 2);
}
