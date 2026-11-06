// The world is a pure function of a seed and coordinates. Nothing here is stored,
// so a whole forest fits in one number, and the shack is a local override that the
// function consults first.

import {
  FIXTURE_IDS,
  type FixtureId,
  FIXTURES,
  NODE_IDS,
  type NodeId,
  nodeOf,
  OVERRIDES,
  SHACK_MAP,
  SHACK_TOP,
  type Terrain,
} from "./content.ts";

export type Point = { x: number; y: number };

// The land stays open this far from the shack, so no forest can seal the door.
const CLEARING = 8;
const RAT_DISTANCE = 22;

function mapLetter(x: number, y: number): string | null {
  const row = SHACK_MAP[y - SHACK_TOP];
  if (!row) return null;
  const letter = row[x + (row.length - 1) / 2];
  return letter && letter !== " " ? letter : null;
}

// Where a fixture stands, read from the map, so moving it is an edit to one drawing.
export function fixtureCell(id: FixtureId): Point {
  for (let row = 0; row < SHACK_MAP.length; row++) {
    const column = SHACK_MAP[row].indexOf(FIXTURES[id].letter);
    if (column >= 0) {
      return {
        x: column - (SHACK_MAP[row].length - 1) / 2,
        y: row + SHACK_TOP,
      };
    }
  }
  throw new Error(`The shack map has no ${id}.`);
}

export function fixtureAt(x: number, y: number): FixtureId | null {
  const letter = mapLetter(x, y);
  return FIXTURE_IDS.find((id) => FIXTURES[id].letter === letter) ?? null;
}

export function terrainAt(seed: number, x: number, y: number): Terrain {
  const letter = mapLetter(x, y);
  if (letter) return OVERRIDES[letter];

  const out = Math.hypot(x, y);
  const raw = 0.65 * noise(seed, x, y, 9) + 0.35 * noise(seed + 1, x, y, 3);
  // Flatten the land near the shack. Otherwise some seeds would bury the door.
  const height = 0.5 +
    (raw - 0.5) * Math.min(1, Math.max(0, out - CLEARING) / 8);
  if (height < 0.3) return "water";
  if (height > 0.7) return "rock";
  return noise(seed + 2, x, y, 6) < 0.5 ? "forest" : "meadow";
}

export function isPassable(terrain: Terrain): boolean {
  return terrain === "meadow" || terrain === "forest" || terrain === "floor" ||
    terrain === "path";
}

const rats = new Map<number, Point>();

// The one sleeping rat: a stroll from the shack, in a direction the seed picks.
// Memoized because it is a search; the answer depends only on the seed.
export function ratCell(seed: number): Point {
  const known = rats.get(seed);
  if (known) return known;
  const angle = gridValue(seed + 13, 0, 0) * Math.PI * 2;
  const ox = Math.round(Math.cos(angle) * RAT_DISTANCE);
  const oy = Math.round(Math.sin(angle) * RAT_DISTANCE);
  for (let r = 0; r < 40; r++) {
    for (let y = oy - r; y <= oy + r; y++) {
      for (let x = ox - r; x <= ox + r; x++) {
        if (Math.max(Math.abs(x - ox), Math.abs(y - oy)) !== r) continue;
        if (nodeOf("ratnap").terrain.includes(terrainAt(seed, x, y))) {
          const found = { x, y };
          rats.set(seed, found);
          return found;
        }
      }
    }
  }
  throw new Error(`Seed ${seed} has nowhere for a rat to sleep.`);
}

// What lies at a cell before anyone has picked it. A hash, not a list, so that a
// save file records only the exceptions: what the chef has taken.
export function nodeAt(seed: number, x: number, y: number): NodeId | null {
  const rat = ratCell(seed);
  if (rat.x === x && rat.y === y) return "ratnap";
  if (Math.hypot(x, y) <= 6) return null;
  const terrain = terrainAt(seed, x, y);
  let roll = gridValue(seed + 11, x, y);
  for (const id of NODE_IDS) {
    const { density, terrain: allowed } = nodeOf(id);
    if (density === undefined || !allowed.includes(terrain)) continue;
    if (roll < density) return id;
    roll -= density;
  }
  return null;
}

// Value noise: random numbers at coarse grid points, blended between them, so
// that terrain forms regions instead of static.
function noise(seed: number, x: number, y: number, scale: number): number {
  const left = Math.floor(x / scale);
  const top = Math.floor(y / scale);
  const blendX = smooth(x / scale - left);
  const blendY = smooth(y / scale - top);
  return mix(
    mix(gridValue(seed, left, top), gridValue(seed, left + 1, top), blendX),
    mix(
      gridValue(seed, left, top + 1),
      gridValue(seed, left + 1, top + 1),
      blendX,
    ),
    blendY,
  );
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// A hash, not a generator: the same inputs give the same number in [0, 1), with
// no memory of earlier calls. Exported because tile variety wants the same property.
export function gridValue(seed: number, x: number, y: number): number {
  let hash = Math.imul(seed, 0x9e3779b1) ^ Math.imul(x, 0x85ebca6b) ^
    Math.imul(y, 0xc2b2ae35);
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d);
  hash = Math.imul(hash ^ (hash >>> 12), 0x297a2d39);
  return ((hash ^ (hash >>> 15)) >>> 0) / 2 ** 32;
}
