import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
  canEnter,
  fixtureCell,
  isPassable,
  newGame,
  nodeAt,
  OVERRIDES,
  ratCell,
  SHACK_MAP,
  SHACK_TOP,
  terrainAt,
} from "./mod.ts";

const SEEDS = [1, 2, 3, 121, 2026];

function sample(seed: number, originX = 0, originY = 0): string[] {
  const cells: string[] = [];
  for (let y = originY - 30; y < originY + 30; y++) {
    for (let x = originX - 30; x < originX + 30; x++) {
      cells.push(`${terrainAt(seed, x, y)}:${nodeAt(seed, x, y)}`);
    }
  }
  return cells;
}

Deno.test("terrain depends only on seed and coordinates", () => {
  assertEquals(sample(121), sample(121));
  assertEquals(
    sample(121, 1_000_000, -1_000_000),
    sample(121, 1_000_000, -1_000_000),
  );
});

Deno.test("different seeds give different worlds", () => {
  assertNotEquals(sample(121), sample(122));
});

Deno.test("the shack override is the same in every world", () => {
  for (const seed of SEEDS) {
    SHACK_MAP.forEach((row, index) => {
      [...row].forEach((letter, column) => {
        if (letter === " ") return;
        const x = column - (row.length - 1) / 2;
        const y = index + SHACK_TOP;
        assertEquals(terrainAt(seed, x, y), OVERRIDES[letter], `${x},${y}`);
        assertEquals(nodeAt(seed, x, y), null);
      });
    });
    assertEquals(terrainAt(seed, 0, 0), "floor");
    assertEquals(terrainAt(seed, 0, 2), "floor");
    assertEquals(terrainAt(seed, 1, 2), "wall");
  }
});

Deno.test("the hearth is reachable from the chef's start", () => {
  const hearth = fixtureCell("hearth");
  assertEquals(hearth, { x: 0, y: -2 });
  assert(isPassable(terrainAt(1, hearth.x, hearth.y + 1)));
});

Deno.test("no seed seals the door: the forest opens up beyond it", () => {
  for (const seed of SEEDS) {
    const state = newGame(seed);
    const seen = new Set(["0,0"]);
    const frontier = [{ x: 0, y: 0 }];
    while (frontier.length > 0 && seen.size < 2000) {
      const { x, y } = frontier.pop()!;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const key = `${nx},${ny}`;
        if (seen.has(key) || !canEnter(state, nx, ny)) continue;
        seen.add(key);
        frontier.push({ x: nx, y: ny });
      }
    }
    assert(seen.size >= 2000, `seed ${seed} stops at ${seen.size} cells`);
  }
});

Deno.test("every world has its one rat, outdoors and far from the door", () => {
  for (const seed of SEEDS) {
    const { x, y } = ratCell(seed);
    assertEquals(nodeAt(seed, x, y), "ratnap");
    assert(Math.hypot(x, y) > 15, `seed ${seed} rat is too close`);
  }
});
