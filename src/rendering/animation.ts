import { Position } from '../utils/types.js';

interface MoveAnimation {
  pieceId: string;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  progress: number;
  speed: number;
}

let activeAnimation: MoveAnimation | null = null;

export function startMoveAnimation(pieceId: string, from: Position, to: Position, speed = 0.1): void {
  activeAnimation = { pieceId, fromCol: from.col, fromRow: from.row, toCol: to.col, toRow: to.row, progress: 0, speed };
}

export function updateAnimation(): boolean {
  if (!activeAnimation) return false;
  activeAnimation.progress += activeAnimation.speed;
  if (activeAnimation.progress >= 1) {
    activeAnimation = null;
    return false;
  }
  return true;
}

export function isAnimating(): boolean {
  return activeAnimation !== null;
}

/** Get the visual position override for an animating piece. Returns {row, col} with fractional values, or null. */
export function getAnimatedPosition(pieceId: string): { row: number; col: number } | null {
  if (!activeAnimation || activeAnimation.pieceId !== pieceId) return null;
  const t = activeAnimation.progress;
  // Ease out cubic
  const ease = 1 - Math.pow(1 - t, 3);
  return {
    row: activeAnimation.fromRow + (activeAnimation.toRow - activeAnimation.fromRow) * ease,
    col: activeAnimation.fromCol + (activeAnimation.toCol - activeAnimation.fromCol) * ease,
  };
}
