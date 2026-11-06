import { assert, assertEquals } from "@std/assert";
import {
  apply,
  type Direction,
  fixtureCell,
  FIXTURES,
  type GameState,
  ITEMS,
  newGame,
  nodeAt,
  RECIPES,
} from "./mod.ts";

// Each test has a Given-When-Then shape: https://martinfowler.com/bliki/GivenWhenThen.html
const SEED = 121;

function go(state: GameState, ...directions: Direction[]) {
  return directions.flatMap((direction) =>
    apply(state, { type: "move", direction })
  );
}

// A chef one step south of the hearth, holding exactly these things.
function atHearth(inventory: GameState["inventory"]): GameState {
  const state = newGame(SEED);
  const hearth = fixtureCell("hearth");
  state.player = { x: hearth.x, y: hearth.y + 1 };
  state.inventory = inventory;
  return state;
}

Deno.test("moving across the floor moves the chef", () => {
  const state = newGame(SEED);

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x: 1, y: 0 });
  assertEquals(events, [{
    type: "moved",
    from: { x: 0, y: 0 },
    to: { x: 1, y: 0 },
  }]);
});

Deno.test("a wall stops the chef and changes nothing", () => {
  const state = newGame(SEED);
  go(state, "east", "east", "east");
  assertEquals(state.player, { x: 3, y: 0 });
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = go(state, "east");

  assertEquals(state, snapshot);
  assertEquals(events[0].type, "blocked");
});

Deno.test("the only way out of the shack is the door to the south", () => {
  const state = newGame(SEED);

  go(state, "south", "south", "south");

  assertEquals(state.player, { x: 0, y: 3 });
});

Deno.test("an event keeps its cells while state moves on", () => {
  const state = newGame(SEED);

  const first = go(state, "east");
  go(state, "west", "east");

  assertEquals(first, [{
    type: "moved",
    from: { x: 0, y: 0 },
    to: { x: 1, y: 0 },
  }]);
});

Deno.test("foraging takes a thing once, and the world remembers", () => {
  const state = newGame(SEED);
  let target = null;
  for (let x = 7; x < 200 && !target; x++) {
    if (nodeAt(SEED, x, 20)) target = { x, y: 20 };
  }
  assert(target);
  state.player = { x: target.x - 1, y: target.y };
  const events = go(state, "east");
  const item = events.find((event) => event.type === "foraged");
  assert(item?.type === "foraged");
  assertEquals(state.inventory[item.item], 1);

  go(state, "west", "east");

  assertEquals(state.inventory[item.item], 1);
});

Deno.test("a broken hearth refuses the short-handed and changes nothing", () => {
  const state = atHearth({ stick: 2 });
  const snapshot = JSON.parse(JSON.stringify(state));

  const [event] = go(state, "north");

  assertEquals(state, snapshot);
  assert(event.type === "blocked");
  assertEquals(event.line, FIXTURES.hearth.brokenLine);
});

Deno.test("repairing spends the sticks and leaves the chef in place", () => {
  const state = atHearth({ stick: 4 });
  const { player } = JSON.parse(JSON.stringify(state));

  const [event] = go(state, "north");

  assertEquals(event.type, "repaired");
  assertEquals(state.repaired, ["hearth"]);
  assertEquals(state.inventory, { stick: 1 });
  assertEquals(state.player, player);
});

Deno.test("cooking needs a repaired hearth, even with everything in hand", () => {
  const state = atHearth({ rat: 1, stick: 1, thyme: 2 });

  go(state, "north");

  assertEquals(state.review, null);
  assertEquals(state.repaired, []);
  assertEquals(state.inventory, { rat: 1, stick: 1, thyme: 2 });
});

Deno.test("cooking plates the dish, and service ends", () => {
  const state = atHearth({ rat: 1, stick: 1, thyme: 2 });
  state.repaired = ["hearth"];

  const events = go(state, "north");

  assertEquals(events.map((event) => event.type), ["cooked", "plated"]);
  assertEquals(state.inventory, { [RECIPES.dish.makes]: 1 });
  assert(state.review);
  assertEquals(go(state, "south"), []);
  assert(ITEMS.dish.name.includes("Rat-on-a-Stick"));
});
