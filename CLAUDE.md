# CLAUDE.md — Gamblitz

## Project Overview

**Gamblitz** — A Balatro-meets-chess roguelike where the player builds an army, collects artifacts, and modifies pieces to fight through tactical puzzles and boss fights. Enemies telegraph their moves (Into the Breach-style). Built as a browser prototype to validate the core loop.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Build tool:** Vite
- **Rendering:** Raw HTML Canvas 2D — no game framework, no React, no Phaser
- **Package manager:** npm
- **Testing:** Vitest for unit tests on game logic (movement engine, AI, artifacts)
- **No external dependencies** unless absolutely necessary

## Project Structure

```
src/
├── main.ts                  # Entry point, canvas setup, game loop
├── core/
│   ├── game.ts              # Game state machine (menu, level, shop, boss, event)
│   ├── board.ts             # Board grid, coordinate system, square colors
│   ├── piece.ts             # Piece entity: type, owner, position, modifiers, abilities
│   ├── movement.ts          # Generic movement engine (ability-based, not hardcoded chess rules)
│   ├── modifier.ts          # Modifier definitions and slot system
│   ├── artifact.ts          # Artifact definitions, conditions, triggers
│   └── objective.ts         # Level objective definitions and completion checks
├── ai/
│   ├── intent.ts            # Enemy intent computation (telegraphed moves)
│   ├── priority.ts          # Enemy priority list for recalculation
│   └── recalculate.ts       # Intent recalculation after player moves
├── systems/
│   ├── economy.ts           # Gold tracking, earnings, spending
│   ├── shop.ts              # Shop generation, pricing, random selection
│   ├── events.ts            # Random event system
│   ├── king-hp.ts           # King HP, damage, teleport logic
│   ├── promotion.ts         # Pawn promotion (temporary, level-only)
│   ├── placement.ts         # Locked piece placement and relocation
│   └── run.ts               # Run state: rank, level progression, difficulty scaling
├── rendering/
│   ├── canvas.ts            # Canvas utilities, scaling, coordinate conversion
│   ├── board-renderer.ts    # Draw board grid and squares
│   ├── piece-renderer.ts    # Draw pieces (colored shapes for prototype)
│   ├── intent-renderer.ts   # Draw enemy intent arrows
│   ├── ui-renderer.ts       # Draw HUD: gold, HP, moves left, objectives, artifacts
│   └── shop-renderer.ts     # Draw shop screen
├── input/
│   ├── click-handler.ts     # Canvas click detection, piece selection, move execution
│   └── ui-input.ts          # Shop buttons, end turn, undo
├── data/
│   ├── artifacts.ts         # All artifact definitions (start with 10-15 for prototype)
│   ├── modifiers.ts         # All modifier definitions
│   ├── objectives.ts        # All objective templates
│   ├── templates.ts         # Enemy board layout templates
│   └── archetypes.ts        # Starting army archetypes
└── utils/
    ├── rng.ts               # Seeded random number generator (for reproducible runs)
    └── types.ts             # Shared types and enums
```

## Architecture Principles

### Movement Engine (CRITICAL — get this right first)

**Do NOT hardcode chess rules.** Build a generic ability-based movement system.

Each piece has an array of `MovementAbility` objects. Computing legal moves means:
1. For each piece, iterate its ability list
2. Each ability generates candidate target squares
3. Filter candidates: can't land on friendly piece, can't leave own king in danger
4. Return final legal moves

```typescript
// Conceptual structure — not exact implementation
interface MovementAbility {
  type: 'slide' | 'jump' | 'step';        // slide = bishop/rook, jump = knight, step = king/pawn
  directions: Direction[];                  // e.g. ['diagonal'], ['orthogonal'], ['L-shape']
  maxRange?: number;                        // undefined = unlimited (for slide)
  canCapture: boolean;
  canMoveWithoutCapture: boolean;
  conditions?: AbilityCondition[];          // e.g. "only on first move", "only when no friendly nearby"
}

interface Piece {
  id: string;
  type: PieceType;
  owner: 'player' | 'enemy';
  lockedPosition: Position;                 // permanent placement on the board
  currentPosition: Position;                // current position during a level
  abilities: MovementAbility[];             // base abilities + modifier-granted abilities
  modifiers: Modifier[];                    // max 2 slots
  maxModifierSlots: number;                 // default 2
}
```

A vanilla bishop: `abilities: [{ type: 'slide', directions: ['diagonal'], canCapture: true, canMoveWithoutCapture: true }]`

A modifier that adds knight-jump just pushes a new ability onto the array. The engine doesn't care — it just iterates.

### Enemy AI — Into the Breach Style

**No tree search. No minimax. No Stockfish.**

Each enemy piece computes its intent at the start of the player's turn using a simple priority list:

1. Capture highest-value player piece in range
2. Move toward nearest high-value target
3. Advance toward player king
4. Advance pawns forward
5. Hold position

Intent is displayed as arrows/highlights on the board.

After EACH player move, recalculate all enemy intents:
1. If original intent is still legal → keep it
2. Otherwise, re-run the priority list from the top

Show the recalculation visually (arrows update).

### Game State Machine

```
MENU → RUN_START (generate army) → LEVEL → POST_LEVEL (event? + shop) → LEVEL → ... → ELITE → POST_LEVEL → BOSS → RANK_SUMMARY → next rank or GAME_OVER
```

Within a level:
```
PLAYER_TURN_START (show enemy intents) → PLAYER_MOVING (execute moves, recalculate intents after each) → PLAYER_TURN_END (check objective) → ENEMY_TURN (enemies execute intents) → check win/loss → PLAYER_TURN_START
```

### King HP System

- Both player and enemy boss kings have HP (integer).
- Player king: starts at 3 (scales with difficulty).
- Enemy boss king: starts at 1, scales with rank.
- When a king is "hit" (captured/checked): lose 1 HP, teleport to a random safe square.
- Safe square rules: not adjacent to any enemy piece, not in direct line of attack.
- At 0 HP: king is defeated.
- No traditional check or checkmate logic exists in this game.

### Enemy Pawn Promotion

- Enemy pawn reaching player's back rank: deals 1 damage to player king, pawn is removed.
- On boss levels: pawn promotes to queen AND deals 1 damage.

### Player Pawn Promotion

- Temporary — lasts current level only.
- Promotes to queen by default. Artifacts can unlock underpromotion.
- Modifiers on the pawn are LOST on promotion (default). Artifacts can change this.
- After level ends, pawn returns to its locked position as a pawn.

## Level Structure

### Normal Levels
- No enemy king on the board.
- Objective-based: "capture all bishops", "survive 8 turns", "get a piece to the last rank", "capture 5 pieces in 3 turns".
- Enemy army is generated from templates with some randomness.
- Reward: gold + chance of artifact/modifier.

### Elite Levels
- Harder objectives, stronger enemy army, possible restrictions.
- Higher gold and better rewards.

### Boss Levels
- Enemy king appears with a full army.
- Objective: deplete the enemy king's HP.
- King teleports on each hit. Army defends aggressively.

## Economy

- Gold is the single currency.
- Earned from: completing objectives, captures (with artifacts), artifact bonuses.
- Spent on: pieces, artifacts, modifiers, relocations, extra moves, king heals.

## Shop

- Appears after EVERY level.
- Shows 3 random choices from: new piece, artifact, modifier upgrade, king heal, extra move slot, relocate a piece.
- Prices vary by power. Not every category appears every time.
- Artifacts cannot be sold — only thrown away to free a slot.

## Artifacts

- Passive effects, always active. 4-5 slots (artifact to add slot = very rare).
- 4 rarity tiers: Common (white), Uncommon (blue), Rare (purple), Legendary (gold).
- Types: economy bonuses, conditional modifiers (e.g. "2 bishops on dark squares gain jump"), promotion bonuses, meta bonuses.
- For the prototype: implement 10-15 artifacts covering different types.

## Modifiers

- Direct piece upgrades. 2 slots per piece.
- Types: movement, capture, defensive, conditional.
- Overwriting costs gold.
- Applied during shop phase.

## Player Turn

- Player starts with 2 full moves per turn.
- Full move: move + capture as normal.
- Quick move (granted by artifacts): move 1-2 squares, no capture.
- Can be increased via shop/artifacts. Hard cap: 3 full + 2 quick.

## Starting Army

- Random, based on difficulty.
- Easy: king + rook + knight + 3 pawns. Hard: king + 2 pawns.
- Archetypes: "Pawn Heavy", "Cavalry", "Sniper", etc.
- Pieces may have quirks on harder difficulties.

## Board

- Grid-based. Prototype starts at 6x6 for simplicity.
- Player pieces have locked positions chosen at placement time.
- Board resets to locked positions at the start of each level.
- Enemy pieces are placed per template.

## Rendering (Prototype)

Keep it minimal:
- Board: alternating colored squares on canvas.
- Pieces: colored circles with a letter inside (K, Q, R, B, N, P). Player = blue, enemy = red.
- Selected piece: highlighted square.
- Legal moves: semi-transparent dots on target squares.
- Enemy intent: red arrows from piece to intended target square.
- Recalculated intent: briefly flash yellow before settling on new red arrow.
- HUD: gold counter, king HP hearts, moves remaining, current objective text.
- Shop: simple card-like rectangles with text descriptions and prices.

Do NOT spend time on polished graphics. Readability > aesthetics.

## Prototype Build Order

Build and validate in this exact order:

### Phase 1 — Board & Movement
1. Canvas setup, board rendering (6x6 grid)
2. Piece rendering (colored circles with letters)
3. Click to select piece, show legal moves
4. Click to execute move
5. Implement movement engine with abilities for: pawn, knight, bishop, rook, queen, king
6. Unit tests for all piece movement

### Phase 2 — Turns & Enemy AI
7. Turn system: player moves, then enemies move
8. Multi-move per turn (2 moves, end turn button)
9. Enemy intent computation and arrow rendering
10. Enemy intent recalculation after each player move
11. Basic priority-list AI

### Phase 3 — Objectives & Levels
12. Objective system: "capture piece X", "survive N turns"
13. Level completion detection
14. Level transitions (reset board, new enemy layout)
15. 3-4 enemy layout templates

### Phase 4 — King HP & Boss
16. King HP system (player and enemy)
17. King teleport on hit
18. Boss level: enemy king with HP
19. Enemy pawn promotion (damage to player king)

### Phase 5 — Economy & Shop
20. Gold tracking
21. Shop screen: 3 random choices
22. Buy pieces, place on board (locked position)
23. Pay to relocate a piece
24. King heal option

### Phase 6 — Artifacts & Modifiers
25. Artifact slot system (4 slots)
26. Implement 10-15 artifacts (mix of rarities)
27. Modifier slot system (2 per piece)
28. Implement 8-10 modifiers
29. Artifacts appearing in shop
30. Throw away artifact to replace

### Phase 7 — Run Structure
31. Rank progression: normal → normal → elite → boss
32. Difficulty scaling between ranks
33. Random starting army generation
34. Game over screen with run stats

### Phase 8 — Polish & Infinite Mode
35. Events between levels
36. Player pawn promotion (temporary)
37. Infinite mode with escalating difficulty
38. Mutation rounds in infinite mode
39. Seeded runs for reproducibility

## Code Style

- Strict TypeScript, no `any` types.
- Pure functions for game logic wherever possible. Rendering is separate from logic.
- Game state is a single serializable object — makes save/load trivial later.
- Use the seeded RNG everywhere (no Math.random directly) for reproducibility.
- Small, focused files. One concept per file.
- Tests for: movement generation, AI intent, artifact triggers, objective completion.

## What NOT To Build

- No multiplayer.
- No animations beyond basic arrow updates.
- No sound.
- No save/load (yet).
- No settings menu.
- No tutorial — the prototype is for you, not end users.
- No mobile support — desktop browser only.
- Do NOT use React, Phaser, PixiJS, or any UI/game framework.
