import { assert, assertEquals } from "@std/assert";
import { playToTheEnd } from "./bot.ts";
import {
  apply,
  decodeRun,
  encodeRun,
  newGame,
  WINNING_RUN,
  WINNING_RUN_SEED,
} from "./mod.ts";

Deno.test("the compass-following bot finishes on every seed we try", () => {
  for (const seed of [1, 2, 3, 7, 42, 121, 2026]) {
    const { state, commands } = playToTheEnd(seed);
    assert(state.review, `seed ${seed} never plated in ${commands.length}`);
  }
});

Deno.test("the recorded winning run still wins, by commands alone", () => {
  const state = newGame(WINNING_RUN_SEED);
  for (const command of decodeRun(WINNING_RUN)) apply(state, command);

  assert(state.review, "The recorded run no longer plates the dish.");
  assertEquals(state.inventory.dish, 1);
});

Deno.test("a run survives encoding", () => {
  const { commands } = playToTheEnd(WINNING_RUN_SEED);

  assertEquals(decodeRun(encodeRun(commands)), commands);
});
