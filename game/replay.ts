import type { Command, Direction } from "../core/mod.ts";
import type { Controller } from "./controller.ts";
import type { Pace } from "./grid/grid_view.ts";

const KEYS: Record<Direction, string> = {
  north: "ArrowUp",
  south: "ArrowDown",
  east: "ArrowRight",
  west: "ArrowLeft",
};

function press(key: string) {
  const options = { key, bubbles: true, cancelable: true };
  dispatchEvent(new KeyboardEvent("keydown", options));
  dispatchEvent(new KeyboardEvent("keyup", options));
}

// Plays a recording by pressing keys, as a person would, so everything downstream of
// the keyboard is the code that runs in a normal game. Plus and minus change speed.
export function playReplay(
  commands: Command[],
  controller: Controller,
  pace: Pace,
  onSpeed: (speed: number) => void,
) {
  const setSpeed = (speed: number) => {
    pace.speed = Math.min(16, Math.max(0.25, speed));
    onSpeed(pace.speed);
  };
  addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") setSpeed(pace.speed * 2);
    if (event.key === "-") setSpeed(pace.speed / 2);
  });
  setSpeed(pace.speed);

  let index = 0;
  const pressNext = () => {
    if (index < commands.length) press(KEYS[commands[index++].direction]);
  };
  const settled = controller.onSettled;
  controller.onSettled = () => {
    settled();
    pressNext();
  };
  pressNext();
}
