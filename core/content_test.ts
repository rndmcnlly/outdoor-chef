import { assert, assertEquals } from "@std/assert";
import {
  FIXTURE_IDS,
  FIXTURES,
  type ItemId,
  ITEMS,
  NODE_IDS,
  nodeOf,
  RECIPE_IDS,
  RECIPES,
} from "./mod.ts";

// Everything obtainable, grown from nothing until a whole pass adds nothing new:
// a fixpoint. It reads only the tables, so a designer who breaks the chain of
// recipes hears about it here, with no map and no play involved.
function obtainable() {
  const items = new Set<ItemId>();
  const repaired = new Set<string>();
  const cooked = new Set<string>();
  let changed = true;
  const covers = (inputs: Partial<Record<ItemId, number>>) =>
    Object.keys(inputs).every((item) => items.has(item as ItemId));
  while (changed) {
    changed = false;
    for (const id of NODE_IDS) {
      const item = nodeOf(id).yields;
      if (!items.has(item)) {
        items.add(item);
        changed = true;
      }
    }
    for (const id of FIXTURE_IDS) {
      if (!repaired.has(id) && covers(FIXTURES[id].repair)) {
        repaired.add(id);
        changed = true;
      }
    }
    for (const id of RECIPE_IDS) {
      const { at, inputs, makes } = RECIPES[id];
      if (!cooked.has(id) && repaired.has(at) && covers(inputs)) {
        cooked.add(id);
        items.add(makes);
        changed = true;
      }
    }
  }
  return { items, repaired, cooked };
}

Deno.test("fixpoint: every item, repair, and recipe can be reached", () => {
  const { items, repaired, cooked } = obtainable();

  assertEquals([...items].sort(), Object.keys(ITEMS).sort());
  assertEquals([...repaired].sort(), [...FIXTURE_IDS].sort());
  assertEquals([...cooked].sort(), [...RECIPE_IDS].sort());
});

Deno.test("every ingredient the tables ask for has a source", () => {
  const sources = new Set<string>(NODE_IDS.map((id) => nodeOf(id).yields));
  for (const id of RECIPE_IDS) sources.add(RECIPES[id].makes);
  for (const id of RECIPE_IDS) {
    for (const item of Object.keys(RECIPES[id].inputs)) {
      assert(sources.has(item), `${id} wants ${item}, which nothing yields`);
    }
  }
});
