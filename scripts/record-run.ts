// Records the demo run: the bot plays seed 121 through the core, and its commands
// become a file. Rerun after changing content: deno task record-run

import { playToTheEnd } from "../core/bot.ts";
import { encodeRun, WINNING_RUN_SEED } from "../core/mod.ts";

// The demo opens by walking into the broken hearth, because that is the premise.
const { state, commands } = playToTheEnd(WINNING_RUN_SEED, [
  { type: "move", direction: "north" },
  { type: "move", direction: "north" },
]);
if (!state.review) {
  throw new Error("The bot did not finish, so no run to record.");
}
const run = encodeRun(commands);
const lines = run.match(/.{1,70}(\s|$)/g)!.map((line) =>
  `  ${JSON.stringify(line)},`
).join("\n");
await Deno.writeTextFile(
  new URL("../core/winning_run.ts", import.meta.url),
  `// Written by scripts/record-run.ts. core/run_test.ts checks it still wins.
export const WINNING_RUN_SEED = ${WINNING_RUN_SEED};
export const WINNING_RUN = [
${lines}
].join("");
`,
);
console.log(
  `Recorded ${commands.length} commands, ${state.turn} steps, ` +
    `${state.review.pinecones} pinecones.`,
);
