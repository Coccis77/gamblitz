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
export const GOLD_LEVEL_COMPLETE = 5;
export const GOLD_BOSS_COMPLETE = 10;
