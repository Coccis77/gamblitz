import { CanvasContext } from './canvas.js';
import { BOARD_SIZE } from '../utils/types.js';
import { ButtonRect } from './ui-renderer.js';

const TUTORIAL_PAGES = [
  {
    title: 'How to Play',
    lines: [
      'Build an army, fight through levels,',
      'defeat bosses, and collect artifacts.',
      '',
      'Click a piece to select it.',
      'Click a highlighted square to move.',
      'Capture enemy pieces to earn gold.',
    ],
  },
  {
    title: 'Turns & Moves',
    lines: [
      'You have 2 moves per turn.',
      'After capturing, a piece is exhausted',
      'and cannot act again this turn.',
      '',
      'Enemy intents are shown as red arrows.',
      'Plan around them!',
    ],
  },
  {
    title: 'King & HP',
    lines: [
      'Your king has 3 HP.',
      'When hit, it teleports to a safe square.',
      'At 0 HP, it\'s game over.',
      '',
      'HP carries between levels.',
      'Heal at the shop or through events.',
    ],
  },
  {
    title: 'Shop & Upgrades',
    lines: [
      'After each level, visit the shop.',
      'Buy pieces, modifiers, artifacts, and heals.',
      '',
      'Modifiers add abilities to specific pieces.',
      'Artifacts give passive bonuses to your run.',
    ],
  },
  {
    title: 'Rank Progression',
    lines: [
      'Each rank has 4 levels:',
      'Normal \u2192 Normal \u2192 Elite \u2192 Boss',
      '',
      'Enemies get stronger each rank.',
      'After rank 2, mutations appear!',
      '',
      'Good luck!',
    ],
  },
];

let nextButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };
let skipButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };

export function getTutorialNextButton(): ButtonRect { return nextButton; }
export function getTutorialSkipButton(): ButtonRect { return skipButton; }
export function getTutorialPageCount(): number { return TUTORIAL_PAGES.length; }

export function drawTutorialScreen(cc: CanvasContext, page: number): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;
  const centerX = boardOriginX + boardPixels / 2;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, cc.canvas.height);
  bgGrad.addColorStop(0, '#1a1a2e');
  bgGrad.addColorStop(1, '#0e0e1a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cc.canvas.width, cc.canvas.height);

  const data = TUTORIAL_PAGES[page];
  if (!data) return;

  // Page indicator
  const dotY = boardOriginY + 10;
  const dotR = 4;
  const dotGap = 14;
  const dotsWidth = TUTORIAL_PAGES.length * dotGap;
  for (let i = 0; i < TUTORIAL_PAGES.length; i++) {
    ctx.beginPath();
    ctx.arc(centerX - dotsWidth / 2 + i * dotGap + dotGap / 2, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i === page ? '#f0c040' : '#333';
    ctx.fill();
  }

  // Title
  const titleFont = Math.floor(squareSize * 0.42);
  ctx.fillStyle = '#f0c040';
  ctx.font = `bold ${titleFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(data.title, centerX, boardOriginY + 30);

  // Lines
  const lineFont = Math.floor(squareSize * 0.22);
  const lineH = lineFont + 8;
  const startY = boardOriginY + 30 + titleFont + 20;
  ctx.font = `${lineFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i]!;
    ctx.fillStyle = line === '' ? 'transparent' : '#bbb';
    ctx.fillText(line, centerX, startY + i * lineH);
  }

  // Buttons
  const btnH = Math.floor(squareSize * 0.55);
  const btnW = Math.floor(squareSize * 2.2);
  const btnY = boardOriginY + boardPixels - btnH - 20;
  const isLast = page === TUTORIAL_PAGES.length - 1;

  // Next / Start button
  const nextX = centerX - btnW / 2;
  nextButton = { x: nextX, y: btnY, width: btnW, height: btnH };

  const btnGrad = ctx.createLinearGradient(nextX, btnY, nextX, btnY + btnH);
  btnGrad.addColorStop(0, '#5a9ae0');
  btnGrad.addColorStop(1, '#3a70b0');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(nextX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.24)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isLast ? 'Start Game' : 'Next', nextX + btnW / 2, btnY + btnH / 2);

  // Skip button (top-right, small)
  const skipW = Math.floor(squareSize * 1.2);
  const skipH = Math.floor(squareSize * 0.35);
  const skipX = boardOriginX + boardPixels - skipW - 4;
  const skipY = boardOriginY + 4;
  skipButton = { x: skipX, y: skipY, width: skipW, height: skipH };

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(skipX, skipY, skipW, skipH, 4);
  ctx.fill();

  ctx.fillStyle = '#666';
  ctx.font = `${Math.floor(squareSize * 0.16)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Skip', skipX + skipW / 2, skipY + skipH / 2);
}
