import { Position } from '../utils/types.js';

interface FlashEffect {
  position: Position;
  color: string;
  alpha: number;
  decay: number;
}

const activeEffects: FlashEffect[] = [];

export function addFlash(pos: Position, color: string): void {
  activeEffects.push({ position: pos, alpha: 0.6, decay: 0.03, color });
}

export function updateEffects(): void {
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    activeEffects[i]!.alpha -= activeEffects[i]!.decay;
    if (activeEffects[i]!.alpha <= 0) activeEffects.splice(i, 1);
  }
}

export function hasActiveEffects(): boolean {
  return activeEffects.length > 0;
}

export function drawEffects(ctx: CanvasRenderingContext2D, boardOriginX: number, boardOriginY: number, squareSize: number): void {
  for (const effect of activeEffects) {
    const x = boardOriginX + effect.position.col * squareSize;
    const y = boardOriginY + effect.position.row * squareSize;
    ctx.fillStyle = effect.color.replace(')', `, ${effect.alpha})`).replace('rgb', 'rgba');
    ctx.fillRect(x, y, squareSize, squareSize);
  }
}
