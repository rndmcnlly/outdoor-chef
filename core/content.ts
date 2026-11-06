// Everything a designer would want to change, and nothing that does anything.
// Each table has few rows because this is a vertical slice. A larger game is more
// rows: the rules, the tests, and the type checker already know what to ask of them.

export type Terrain =
  | "meadow"
  | "forest"
  | "water"
  | "rock"
  | "floor"
  | "wall"
  | "counter"
  | "path";

export const ITEMS = {
  stick: {
    name: "Artisanal Stick",
    note: "Free-range. Aged on the forest floor for one to forty years.",
  },
  thyme: {
    name: "Feral Thyme",
    note: "The thyme is wild; so am I.",
  },
  rat: {
    name: "Rat, Whole, Indignant",
    note: "Pasture-raised, by which I mean he ran through a pasture.",
  },
  dish: {
    name: "Rat-on-a-Stick, Bois Sauvage",
    note: "The dish. The whole reason any of us are out here.",
  },
};

export type ItemId = keyof typeof ITEMS;

type Inputs = Partial<Record<ItemId, number>>;

// Sculpted by hand and laid over the seeded world, so every episode has the same
// shack in a different forest. Each row is centered on x = 0; SHACK_TOP is the y of
// the first row, which puts the chef's start, (0, 0), in the middle of the room.
// A space means no override: the forest shows through.
export const SHACK_TOP = -3;
export const SHACK_MAP = [
  "WWWWWWWWW",
  "W...H...W",
  "W.......W",
  "WCC.....W",
  "W.......W",
  "WWWW.WWWW",
  "    P    ",
  "    P    ",
  "    P    ",
];

export const OVERRIDES: Record<string, Terrain> = {
  W: "wall",
  ".": "floor",
  H: "floor",
  C: "counter",
  P: "path",
};

// Things you fix, then use. Find one by its letter in the shack map.
export const FIXTURES = {
  hearth: {
    letter: "H",
    name: "The Hearth (Open Concept)",
    repair: { stick: 3 } as Inputs,
    brokenLine:
      "The hearth has collapsed. Three good sticks, and I can shore it up.",
    repairedLine: "The hearth lives. Open-concept kitchen, zero inspections.",
  },
};

export type FixtureId = keyof typeof FIXTURES;

export const FIXTURE_IDS = Object.keys(FIXTURES) as FixtureId[];

// Things that lie around outside, for the taking.
export type NodeDef = {
  yields: ItemId;
  terrain: Terrain[];
  // The chance a suitable cell holds this. Absent means exactly one per world.
  density?: number;
};

export const NODES = {
  deadfall: { yields: "stick", terrain: ["meadow", "forest"], density: 0.05 },
  thymepatch: { yields: "thyme", terrain: ["meadow"], density: 0.06 },
  ratnap: { yields: "rat", terrain: ["meadow", "forest"] },
} satisfies Record<string, NodeDef>;

export type NodeId = keyof typeof NODES;

export const NODE_IDS = Object.keys(NODES) as NodeId[];

export function nodeOf(id: NodeId): NodeDef {
  return NODES[id];
}

export const RECIPES = {
  dish: {
    at: "hearth" as FixtureId,
    inputs: { rat: 1, stick: 1, thyme: 2 } as Inputs,
    makes: "dish" as ItemId,
    shortLine:
      "Not yet. A stick, two thyme, and a rat, and I will not be moved.",
    line:
      "Fire, stick, rat. I turn it once, like a man who has read about this.",
  },
};

export type RecipeId = keyof typeof RECIPES;

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

export const REFUSALS: Partial<Record<Terrain, string>> = {
  water: "The lake declines to be walked on. I have asked twice.",
  rock: "Rock. Not the sauce-friendly kind.",
  wall: "A wall. We will keep that take, it reads as passion.",
  counter: "The marble island. It is a plank. It is still in my way.",
};

export const REVIEW_COPY = {
  guide: "Le Guide Sauvage",
  awards: {
    1: "One Pinecone: worth stopping for, if you are lost.",
    2: "Two Pinecones: worth a detour, if the detour is already on fire.",
    3: "Three Pinecones: worth a special journey, and a tetanus booster.",
  },
  // The fewer paces, the more the critic believes in the chef.
  threePineconesWithin: 170,
  twoPineconesWithin: 320,
};
