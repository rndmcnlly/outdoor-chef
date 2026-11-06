// A run is a seed and its commands, which is all a replay needs: the core is
// deterministic. Written compactly: "S3 E2 N" means south x3, east x2, north.

import type { Command, Direction } from "./rules.ts";

const LETTERS: Record<Direction, string> = {
  north: "N",
  south: "S",
  east: "E",
  west: "W",
};

const DIRECTIONS: Record<string, Direction> = {
  N: "north",
  S: "south",
  E: "east",
  W: "west",
};

export function encodeRun(commands: Command[]): string {
  const tokens: string[] = [];
  let i = 0;
  while (i < commands.length) {
    const { direction } = commands[i];
    let length = 1;
    while (commands[i + length]?.direction === direction) length++;
    tokens.push(`${LETTERS[direction]}${length > 1 ? length : ""}`);
    i += length;
  }
  return tokens.join(" ");
}

export function decodeRun(run: string): Command[] {
  return run.split(/\s+/).filter(Boolean).flatMap((token) => {
    const direction = DIRECTIONS[token[0]];
    const length = Number(token.slice(1)) || 1;
    return Array.from({ length }, (): Command => ({ type: "move", direction }));
  });
}
