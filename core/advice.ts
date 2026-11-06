// What should the chef do next? Answered by working backward from the dish through
// the same tables the rules use. The compass asks this, and so does the bot that
// records the winning run, so a bot that wins proves the compass tells the truth.

import {
  type FixtureId,
  FIXTURES,
  type ItemId,
  NODE_IDS,
  nodeOf,
  RECIPE_IDS,
  RECIPES,
} from "./content.ts";
import {
  canEnter,
  type Cell,
  count,
  type GameState,
  nodeHere,
} from "./rules.ts";
import { fixtureCell } from "./terrain.ts";

export type Advice =
  | { kind: "forage"; item: ItemId; cell: Cell }
  | { kind: "repair"; fixture: FixtureId; cell: Cell }
  | { kind: "cook"; fixture: FixtureId; cell: Cell }
  | { kind: "served" };

export function nextStep(state: GameState): Advice {
  if (state.review) return { kind: "served" };
  const recipe = RECIPES[RECIPE_IDS[0]];
  const fixture = recipe.at;
  const repaired = state.repaired.includes(fixture);
  const needs = repaired ? recipe.inputs : FIXTURES[fixture].repair;
  for (const [key, need] of Object.entries(needs)) {
    const item = key as ItemId;
    if (count(state, item) >= need) continue;
    const cell = nearestSource(state, item);
    if (cell) return { kind: "forage", item, cell };
  }
  const cell = fixtureCell(fixture);
  return repaired
    ? { kind: "cook", fixture, cell }
    : { kind: "repair", fixture, cell };
}

function nearestSource(state: GameState, item: ItemId): Cell | null {
  const sources = NODE_IDS.filter((id) => nodeOf(id).yields === item);
  const path = route(state, (x, y) => {
    const here = nodeHere(state, x, y);
    return here !== null && sources.includes(here);
  });
  return path?.at(-1) ?? null;
}

const WAYS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

// Breadth-first search from the chef to the first cell the test accepts. The goal
// may be solid, because solid things are used by walking into them.
export function route(
  state: GameState,
  isGoal: (x: number, y: number) => boolean,
): Cell[] | null {
  const start = state.player;
  const cameFrom = new Map<string, Cell | null>([
    [`${start.x},${start.y}`, null],
  ]);
  let frontier: Cell[] = [start];
  while (frontier.length > 0) {
    const next: Cell[] = [];
    for (const cell of frontier) {
      for (const way of WAYS) {
        const x = cell.x + way.x;
        const y = cell.y + way.y;
        const key = `${x},${y}`;
        if (cameFrom.has(key) || Math.hypot(x, y) > 70) continue;
        if (isGoal(x, y)) {
          cameFrom.set(key, cell);
          return unwind(cameFrom, { x, y });
        }
        if (!canEnter(state, x, y)) continue;
        cameFrom.set(key, cell);
        next.push({ x, y });
      }
    }
    frontier = next;
  }
  return null;
}

function unwind(cameFrom: Map<string, Cell | null>, goal: Cell): Cell[] {
  const path: Cell[] = [];
  let at: Cell | null = goal;
  while (at) {
    path.push(at);
    at = cameFrom.get(`${at.x},${at.y}`) ?? null;
  }
  // After reversing, the first entry is where the chef already stands.
  return path.reverse().slice(1);
}
