/** Simple fade transition overlay. */

let fadeAlpha = 0;
let fadeDirection: 'in' | 'out' | 'none' = 'none';
let fadeCallback: (() => void) | null = null;
let fadeSpeed = 0.05;

export function startFadeOut(onMidpoint: () => void, speed = 0.05): void {
  fadeAlpha = 0;
  fadeDirection = 'out';
  fadeCallback = onMidpoint;
  fadeSpeed = speed;
}

export function isFading(): boolean {
  return fadeDirection !== 'none';
}

export function updateFade(): void {
  if (fadeDirection === 'out') {
    fadeAlpha += fadeSpeed;
    if (fadeAlpha >= 1) {
      fadeAlpha = 1;
      if (fadeCallback) {
        fadeCallback();
        fadeCallback = null;
      }
      fadeDirection = 'in';
    }
  } else if (fadeDirection === 'in') {
    fadeAlpha -= fadeSpeed;
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      fadeDirection = 'none';
    }
  }
}

export function drawFade(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  if (fadeAlpha <= 0) return;
  ctx.fillStyle = `rgba(10, 10, 20, ${fadeAlpha})`;
  ctx.fillRect(0, 0, width, height);
}
