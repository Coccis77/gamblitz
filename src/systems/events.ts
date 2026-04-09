import { RngFn, pick } from '../utils/rng.js';

export type EventEffect =
  | { kind: 'bonus_gold'; amount: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'extra_move_this_level' }
  | { kind: 'bonus_gold_next_captures'; amount: number; captures: number }
  | { kind: 'nothing' };

export interface EventOption {
  label: string;
  description: string;
  effect: EventEffect;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  options: EventOption[];
}

const POSITIVE_EVENTS: GameEvent[] = [
  {
    id: 'treasure_chest',
    title: 'Treasure Chest',
    description: 'You found a hidden chest!',
    options: [
      { label: 'Open it', description: '+8 gold', effect: { kind: 'bonus_gold', amount: 8 } },
    ],
  },
  {
    id: 'wandering_healer',
    title: 'Wandering Healer',
    description: 'A healer offers to tend your king.',
    options: [
      { label: 'Accept', description: '+1 HP', effect: { kind: 'heal', amount: 1 } },
    ],
  },
  {
    id: 'rally',
    title: 'Rally the Troops',
    description: 'Your army is inspired!',
    options: [
      { label: 'Charge!', description: '+1 move next level', effect: { kind: 'extra_move_this_level' } },
    ],
  },
  {
    id: 'bounty',
    title: 'Bounty Posted',
    description: 'A bounty has been placed on the enemy.',
    options: [
      { label: 'Accept', description: '+2 gold for next 3 captures', effect: { kind: 'bonus_gold_next_captures', amount: 2, captures: 3 } },
    ],
  },
  {
    id: 'small_treasure',
    title: 'Loose Coins',
    description: 'You find coins scattered on the road.',
    options: [
      { label: 'Collect', description: '+3 gold', effect: { kind: 'bonus_gold', amount: 3 } },
    ],
  },
];

const CHOICE_EVENTS: GameEvent[] = [
  {
    id: 'merchant',
    title: 'Traveling Merchant',
    description: 'A merchant offers you a deal.',
    options: [
      { label: 'Buy supplies', description: '+2 HP, costs 5 gold', effect: { kind: 'heal', amount: 2 } },
      { label: 'Decline', description: 'Nothing happens', effect: { kind: 'nothing' } },
    ],
  },
  {
    id: 'fork_in_road',
    title: 'Fork in the Road',
    description: 'Two paths lie ahead.',
    options: [
      { label: 'Short path', description: '+5 gold', effect: { kind: 'bonus_gold', amount: 5 } },
      { label: 'Long path', description: '+1 HP', effect: { kind: 'heal', amount: 1 } },
    ],
  },
  {
    id: 'war_council',
    title: 'War Council',
    description: 'Your generals propose two strategies.',
    options: [
      { label: 'Aggressive', description: '+1 move next level', effect: { kind: 'extra_move_this_level' } },
      { label: 'Defensive', description: '+1 HP', effect: { kind: 'heal', amount: 1 } },
    ],
  },
  {
    id: 'tavern',
    title: 'Roadside Tavern',
    description: 'Your troops find a tavern.',
    options: [
      { label: 'Celebrate', description: '+10 gold, spend the night', effect: { kind: 'bonus_gold', amount: 10 } },
      { label: 'Rest up', description: '+2 HP', effect: { kind: 'heal', amount: 2 } },
    ],
  },
];

/** Roll for a random event. ~40% chance of no event. */
export function rollEvent(rng: RngFn): GameEvent | null {
  if (rng() < 0.4) return null;

  // 60% positive, 40% choice
  if (rng() < 0.6) {
    return pick(POSITIVE_EVENTS, rng) ?? null;
  }
  return pick(CHOICE_EVENTS, rng) ?? null;
}
