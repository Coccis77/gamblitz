import { LevelType } from './run.js';

export interface Economy {
  gold: number;
}

export function createEconomy(): Economy {
  return { gold: 0 };
}

export function earnGold(eco: Economy, amount: number): void {
  eco.gold += amount;
}

export function spendGold(eco: Economy, amount: number): boolean {
  if (eco.gold < amount) return false;
  eco.gold -= amount;
  return true;
}

// Rewards
export const GOLD_PER_CAPTURE = 1;

// Normal: turn 1-2=10, 3=8, 4=6, 5=4, 6=3, 7=2, 8+=1
const NORMAL_GOLD = [10, 10, 8, 6, 4, 3, 2];
// Elite/Boss: turn 1-3=10, then shifted: 4=8, 5=6, 6=4, 7=3, 8=2, 9+=1
const ELITE_GOLD = [10, 10, 10, 8, 6, 4, 3, 2];

export function getCompletionGold(turnsUsed: number, levelType: LevelType): number {
  const table = levelType === 'normal' ? NORMAL_GOLD : ELITE_GOLD;
  const index = turnsUsed - 1; // turns are 1-based
  if (index < 0) return table[0]!;
  if (index >= table.length) return 1;
  return table[index]!;
}
