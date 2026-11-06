import {
  apply,
  type Command,
  decodeRun,
  type GameEvent,
  newGame,
  WINNING_RUN,
  WINNING_RUN_SEED,
} from "../core/mod.ts";
import { Controller } from "./controller.ts";
import { startGridView } from "./grid/grid_view.ts";
import { Hud } from "./hud.ts";
import { playOpening } from "./opening.ts";
import { Presenter } from "./presenter.ts";
import { playReplay } from "./replay.ts";
import { Sounds } from "./sounds.ts";

// Where everything is wired together, and the only file that knows every part.
// Hexagonal Architecture (the core inside; keys, grid, HUD, sound, and tests around
// it): https://alistair.cockburn.us/hexagonal-architecture

// ?seed=7 picks another forest. ?replay&speed=3 plays the recorded run through the
// keyboard path. ?skip=plate starts one step before the ending.
const params = new URLSearchParams(location.search);
const replaying = params.has("replay");
const skipping = params.get("skip") === "plate";
const seed = replaying || skipping
  ? WINNING_RUN_SEED
  : Number(params.get("seed")) || 121;

const state = newGame(seed);
const run = decodeRun(WINNING_RUN);
let remaining: Command[] = run;
const fastForwarded: { events: GameEvent[]; turn: number }[] = [];

// DEMO SEAM: there is no special late-game state. This runs the recorded commands
// through apply() and drops the animation, which only a deterministic core allows.
if (skipping) {
  for (const command of run.slice(0, -1)) {
    fastForwarded.push({ events: apply(state, command), turn: state.turn });
  }
  remaining = run.slice(-1);
}

const pace = { speed: Number(params.get("speed")) || 1 };
const hud = new Hud(state, pace);
for (const { events, turn } of fastForwarded) hud.ingest(events, turn);
const sounds = new Sounds(
  document.getElementById("mute") as HTMLButtonElement,
);
const grid = await startGridView(document.getElementById("grid")!, state, pace);
const presenter = new Presenter([grid, hud, sounds]);
const controller = new Controller(state, presenter);
controller.onSettled = () => hud.settled();

// For poking at in the browser console, such as comparing logical state with
// presentation state: game.state
Object.assign(globalThis, {
  game: { state, grid, hud, sounds, presenter, controller, pace },
});

const startPlay = () => {
  controller.locked = false;
  if (replaying) {
    const badge = document.getElementById("replay-badge")!;
    badge.hidden = false;
    playReplay(remaining, controller, pace, (speed) => {
      badge.textContent = `REPLAY ${speed}x (+/-)`;
    });
  } else {
    controller.next();
  }
};

if (!replaying && !skipping) {
  await playOpening(document.getElementById("opening")!);
}
startPlay();
