import { CanvasContext } from './canvas.js';
import { BOARD_SIZE } from '../utils/types.js';
import { ButtonRect } from './ui-renderer.js';

let startButton: ButtonRect = { x: 0, y: 0, width: 0, height: 0 };

export function getTitleStartButton(): ButtonRect {
  return startButton;
}

/* ── Particle system ─────────────────────────────────────── */

interface Particle {
  x: number;   // 0-1 normalised horizontal position
  y: number;   // 0-1 normalised vertical position (0 = top)
  speed: number; // upward drift per frame (normalised)
  size: number;  // radius in pixels (set at draw time)
  alpha: number; // base opacity
  phase: number; // sine-wave phase for gentle horizontal sway
}

const PARTICLE_COUNT = 6;
let particles: Particle[] = [];
let particlesInitialised = false;

function initParticles(): void {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(spawnParticle(true));
  }
  particlesInitialised = true;
}

function spawnParticle(randomY: boolean): Particle {
  return {
    x: 0.2 + Math.random() * 0.6,
    y: randomY ? Math.random() : 1.05,
    speed: 0.0012 + Math.random() * 0.0015,
    size: 2 + Math.random() * 3,
    alpha: 0.35 + Math.random() * 0.45,
    phase: Math.random() * Math.PI * 2,
  };
}

function updateAndDrawParticles(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const time = Date.now() * 0.001;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]!;
    // drift upward
    p.y -= p.speed;
    // gentle horizontal sway
    const swayX = Math.sin(time + p.phase) * 0.003;
    p.x += swayX;

    // reset particle when it goes above the screen
    if (p.y < -0.05) {
      particles[i] = spawnParticle(false);
      continue;
    }

    // fade out near top
    const fadeAlpha = p.y < 0.15 ? p.y / 0.15 : 1;
    const finalAlpha = p.alpha * fadeAlpha;

    const px = p.x * width;
    const py = p.y * height;

    // golden glow
    const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 2.5);
    grad.addColorStop(0, `rgba(240, 200, 80, ${finalAlpha})`);
    grad.addColorStop(0.5, `rgba(240, 180, 50, ${finalAlpha * 0.4})`);
    grad.addColorStop(1, 'rgba(240, 180, 50, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // bright core
    ctx.fillStyle = `rgba(255, 235, 150, ${finalAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ── Main draw ───────────────────────────────────────────── */

export function drawTitleScreen(cc: CanvasContext): void {
  const { ctx, squareSize, boardOriginX, boardOriginY } = cc;
  const boardPixels = squareSize * BOARD_SIZE;
  const centerX = boardOriginX + boardPixels / 2;
  const centerY = boardOriginY + boardPixels / 2;
  const now = Date.now();

  // Initialise particles on first call
  if (!particlesInitialised) {
    initParticles();
  }

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

  // Draw particles (behind title, adds depth)
  updateAndDrawParticles(ctx, cc.canvas.width, cc.canvas.height);

  // Title glow
  const glowGrad = ctx.createRadialGradient(
    centerX, centerY - squareSize * 0.8, 0,
    centerX, centerY - squareSize * 0.8, squareSize * 3,
  );
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
  const titleGrad = ctx.createLinearGradient(
    centerX - squareSize * 2, 0,
    centerX + squareSize * 2, 0,
  );
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

  /* ── Floating golden king piece ────────────────────────── */
  const floatOffset = Math.sin(now * 0.002) * squareSize * 0.08;
  const kingY = centerY + squareSize * 0.45 + floatOffset;
  const kingFontSize = Math.floor(squareSize * 0.8);

  // King glow underneath
  const kingGlow = ctx.createRadialGradient(
    centerX, kingY, 0,
    centerX, kingY, kingFontSize * 0.7,
  );
  kingGlow.addColorStop(0, 'rgba(240, 200, 80, 0.15)');
  kingGlow.addColorStop(1, 'rgba(240, 200, 80, 0)');
  ctx.fillStyle = kingGlow;
  ctx.beginPath();
  ctx.arc(centerX, kingY, kingFontSize * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // King character
  ctx.font = `${kingFontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillText('\u2654', centerX + 2, kingY + 2);

  // Gold fill
  const kingGrad = ctx.createLinearGradient(
    centerX - kingFontSize * 0.4, kingY - kingFontSize * 0.4,
    centerX + kingFontSize * 0.4, kingY + kingFontSize * 0.4,
  );
  kingGrad.addColorStop(0, '#f0c040');
  kingGrad.addColorStop(0.5, '#ffe8a0');
  kingGrad.addColorStop(1, '#d4a030');
  ctx.fillStyle = kingGrad;
  ctx.fillText('\u2654', centerX, kingY);

  /* ── Pulsing "Start Game" button ───────────────────────── */
  const pulse = Math.sin(now * 0.004) * 0.5 + 0.5; // 0..1

  const btnWidth = squareSize * 3;
  const btnHeight = Math.floor(squareSize * 0.6);
  const btnX = centerX - btnWidth / 2;
  const btnY = centerY + squareSize * 1.4;

  startButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

  // Button shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(btnX + 2, btnY + 2, btnWidth, btnHeight, 8);
  ctx.fill();

  // Button fill — brightness pulsates
  const baseBright = 0.85;
  const bright = baseBright + pulse * 0.15; // 0.85..1.0
  const r1 = Math.round(90 * bright);
  const g1 = Math.round(154 * bright);
  const b1 = Math.round(224 * bright);
  const r2 = Math.round(58 * bright);
  const g2 = Math.round(112 * bright);
  const b2 = Math.round(176 * bright);

  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
  btnGrad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
  btnGrad.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 8);
  ctx.fill();

  // Pulsing border glow
  const borderAlpha = 0.15 + pulse * 0.25; // 0.15..0.40
  ctx.strokeStyle = `rgba(255, 255, 255, ${borderAlpha})`;
  ctx.lineWidth = 1 + pulse * 1; // 1..2
  ctx.stroke();

  // Button text
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(squareSize * 0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Start Game', btnX + btnWidth / 2, btnY + btnHeight / 2);

  /* ── Version text ──────────────────────────────────────── */
  const versionFont = Math.max(10, Math.floor(squareSize * 0.18));
  ctx.font = `${versionFont}px sans-serif`;
  ctx.fillStyle = 'rgba(120, 120, 140, 0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('v0.1 - Prototype', centerX, cc.canvas.height - 8);
}
