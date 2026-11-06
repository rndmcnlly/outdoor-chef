// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import {
  type FixtureId,
  FIXTURES,
  type ItemId,
  type NodeId,
  nodeOf,
  RECIPE_IDS,
  type RecipeId,
  RECIPES,
  REFUSALS,
  REVIEW_COPY,
} from "./content.ts";
import { fixtureAt, isPassable, nodeAt, terrainAt } from "./terrain.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

export type Review = {
  guide: string;
  pinecones: 1 | 2 | 3;
  award: string;
  steps: number;
};

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here.
export type GameState = {
  seed: number;
  player: Cell;
  turn: number;
  inventory: Partial<Record<ItemId, number>>;
  repaired: FixtureId[];
  // The exceptions to the pure world function, as "x,y" keys.
  taken: string[];
  review: Review | null;
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command = { type: "move"; direction: Direction };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; line: string }
  | { type: "foraged"; cell: Cell; node: NodeId; item: ItemId }
  | {
    type: "repaired";
    at: Cell;
    toward: Cell;
    fixture: FixtureId;
    line: string;
  }
  | { type: "cooked"; at: Cell; toward: Cell; recipe: RecipeId; line: string }
  | { type: "plated"; review: Review };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return {
    seed,
    player: { x: 0, y: 0 },
    turn: 0,
    inventory: {},
    repaired: [],
    taken: [],
    review: null,
  };
}

export function count(state: GameState, item: ItemId): number {
  return state.inventory[item] ?? 0;
}

function hasAll(state: GameState, inputs: Partial<Record<ItemId, number>>) {
  return Object.entries(inputs).every(([item, need]) =>
    count(state, item as ItemId) >= need
  );
}

function spend(state: GameState, inputs: Partial<Record<ItemId, number>>) {
  for (const [key, need] of Object.entries(inputs)) {
    const item = key as ItemId;
    const left = count(state, item) - need;
    if (left > 0) state.inventory[item] = left;
    else delete state.inventory[item];
  }
}

export function nodeHere(
  state: GameState,
  x: number,
  y: number,
): NodeId | null {
  return state.taken.includes(`${x},${y}`) ? null : nodeAt(state.seed, x, y);
}

// Whether the chef could stand here. Fixtures are solid: you use them by walking
// into them, so the arrow keys are the whole control scheme.
export function canEnter(state: GameState, x: number, y: number): boolean {
  return !fixtureAt(x, y) && isPassable(terrainAt(state.seed, x, y));
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  // The dish is plated. Service is over.
  if (state.review) return [];
  switch (command.type) {
    case "move":
      return move(state, command.direction);
  }
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };

  const fixture = fixtureAt(to.x, to.y);
  if (fixture) return useFixture(state, fixture, from, to);

  const terrain = terrainAt(state.seed, to.x, to.y);
  if (!isPassable(terrain)) {
    const line = REFUSALS[terrain] ?? "No.";
    return [{ type: "blocked", at: from, toward: to, line }];
  }

  state.player.x = to.x;
  state.player.y = to.y;
  state.turn++;
  const events: GameEvent[] = [{ type: "moved", from, to }];
  const node = nodeHere(state, to.x, to.y);
  if (node) {
    const item = nodeOf(node).yields;
    state.taken.push(`${to.x},${to.y}`);
    state.inventory[item] = count(state, item) + 1;
    events.push({ type: "foraged", cell: { ...to }, node, item });
  }
  return events;
}

// Walking into a fixture repairs it if it is broken, and cooks on it if it is not.
function useFixture(
  state: GameState,
  fixture: FixtureId,
  at: Cell,
  toward: Cell,
): GameEvent[] {
  const def = FIXTURES[fixture];
  if (!state.repaired.includes(fixture)) {
    if (!hasAll(state, def.repair)) {
      return [{ type: "blocked", at, toward, line: def.brokenLine }];
    }
    spend(state, def.repair);
    state.repaired.push(fixture);
    return [{ type: "repaired", at, toward, fixture, line: def.repairedLine }];
  }

  const recipe = RECIPE_IDS.find((id) => RECIPES[id].at === fixture)!;
  const { inputs, makes, shortLine, line } = RECIPES[recipe];
  if (!hasAll(state, inputs)) {
    return [{ type: "blocked", at, toward, line: shortLine }];
  }
  spend(state, inputs);
  state.inventory[makes] = count(state, makes) + 1;
  const review = reviewFor(state);
  state.review = review;
  return [
    { type: "cooked", at, toward, recipe, line },
    { type: "plated", review: { ...review } },
  ];
}

function reviewFor(state: GameState): Review {
  const { threePineconesWithin, twoPineconesWithin, guide, awards } =
    REVIEW_COPY;
  const steps = state.turn;
  const pinecones = steps <= threePineconesWithin
    ? 3
    : steps <= twoPineconesWithin
    ? 2
    : 1;
  return { guide, pinecones, award: awards[pinecones], steps };
}
