import { PieceType, Owner } from '../core/piece.js';

const BASE_URL = 'https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/cburnett';

const PIECE_FILE: Record<Owner, Record<PieceType, string>> = {
  player: {
    king: 'wK', queen: 'wQ', rook: 'wR', bishop: 'wB', knight: 'wN', pawn: 'wP',
  },
  enemy: {
    king: 'bK', queen: 'bQ', rook: 'bR', bishop: 'bB', knight: 'bN', pawn: 'bP',
  },
};

const imageCache = new Map<string, HTMLImageElement>();
let loaded = false;
let loadPromise: Promise<void> | null = null;

export function preloadPieceImages(): Promise<void> {
  if (loadPromise) return loadPromise;

  const entries: { key: string; url: string }[] = [];
  for (const owner of ['player', 'enemy'] as Owner[]) {
    for (const type of ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'] as PieceType[]) {
      const file = PIECE_FILE[owner][type];
      entries.push({ key: `${owner}_${type}`, url: `${BASE_URL}/${file}.svg` });
    }
  }

  loadPromise = Promise.all(
    entries.map(({ key, url }) => new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { imageCache.set(key, img); resolve(); };
      img.onerror = () => { resolve(); }; // fail silently, will fallback to text
      img.src = url;
    })),
  ).then(() => { loaded = true; });

  return loadPromise;
}

export function getPieceImage(owner: Owner, type: PieceType): HTMLImageElement | undefined {
  return imageCache.get(`${owner}_${type}`);
}

export function arePieceImagesLoaded(): boolean {
  return loaded;
}
