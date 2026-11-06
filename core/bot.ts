// A patient player, made entirely of public core functions. It follows the same
// advice as the compass. Tests use it on many seeds, and scripts/record-run.ts uses
// it to record the demo.

import { nextStep, route } from "./advice.ts";
import {
  apply,
  type Cell,
  type Command,
  type Direction,
  type GameState,
  newGame,
} from "./rules.ts";

function directionTo(from: Cell, to: Cell): Direction {
  if (to.x > from.x) return "east";
  if (to.x < from.x) return "west";
  return to.y > from.y ? "south" : "north";
}

export function playToTheEnd(
  seed: number,
  opening: Command[] = [],
  maxCommands = 3000,
): { state: GameState; commands: Command[] } {
  const state = newGame(seed);
  const commands: Command[] = [...opening];
  for (const command of opening) apply(state, command);
  while (!state.review && commands.length < maxCommands) {
    const advice = nextStep(state);
    if (advice.kind === "served") break;
    const { x: gx, y: gy } = advice.cell;
    const path = route(state, (x, y) => x === gx && y === gy);
    if (!path) break;
    for (const cell of path) {
      const command: Command = {
        type: "move",
        direction: directionTo(state.player, cell),
      };
      commands.push(command);
      apply(state, command);
    }
  }
  return { state, commands };
}
