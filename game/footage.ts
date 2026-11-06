import {
  type Cell,
  type GameEvent,
  type ItemId,
  ITEMS,
  type Terrain,
} from "../core/mod.ts";

// Two renderers, one stream. Every event goes to both the pompous log and the raw
// JSON, and neither knows the other exists. Press F in the game to swap them.
// Observer: https://gameprogrammingpatterns.com/observer.html

const CREW = [
  "Dale (sound): the moss is not a course, Chef.",
  "Priya (producer): are you okay? Blink twice.",
  "Dale (sound): I can hear your mustache.",
  "Priya (producer): legal says do not lick that.",
];

// Fancy names. A plain-word table in the page, with no idea it is a joke.
export const TERROIR: Record<Terrain, string> = {
  meadow: "Terroir",
  forest: "The Canopy Cellar",
  water: "Local Spring Reduction",
  rock: "A Mineral Course",
  floor: "The Dining Room",
  wall: "Load-Bearing Garnish",
  counter: "The Marble Island",
  path: "The Tasting Path",
};

// Said when the chef picks up something he has already told us about.
const CAMP_LOG = [
  "Mise en place: three rocks, in order of confidence.",
  "My spatula is a flat stick. My flat stick is a sous chef.",
  "Tonight's special is whatever stops moving, which so far is me.",
  "If you are finding this footage, the sauce needed acid.",
  "The kitchen is a concept at this stage.",
];

// Null for events that are not worth the narrator's breath. Only the first of each
// thing earns its tasting note: `seen` is how many of it the footage already holds.
export function pompous(
  event: GameEvent,
  turn: number,
  seen = 0,
): string | null {
  switch (event.type) {
    case "moved":
      return null;
    case "blocked":
      return event.line;
    case "foraged": {
      const { name, note } = ITEMS[event.item];
      if (seen > 0) {
        return `${name}, again. ${CAMP_LOG[turn % CAMP_LOG.length]}`;
      }
      const crew = turn % 3 === 0 ? ` ${CREW[(turn / 3) % CREW.length]}` : "";
      return `${name}. ${note}${crew}`;
    }
    case "repaired":
    case "cooked":
      return event.line;
    case "plated":
      return "Plate. Wipe the rim with your thumb. Say nothing. Let them come to you.";
  }
}

export function raw(event: GameEvent): string {
  return JSON.stringify(event);
}

// A clip is an event and the turn it happened on, kept for the end of the show.
export type Clip = { event: GameEvent; turn: number };

const COURSES = ["Amuse-bouche", "Hors d'oeuvre", "Intermezzo", "Entree"];

// The end screen's menu is a pure function from the footage to words, with no game
// state involved. Whatever happened first is what gets served first.
export function tastingMenu(clips: Clip[]): { course: string; text: string }[] {
  const seen = new Set<ItemId>();
  const courses: string[] = [];
  for (const { event, turn } of clips) {
    if (event.type === "foraged" && !seen.has(event.item)) {
      seen.add(event.item);
      courses.push(`${ITEMS[event.item].name}, gathered turn ${turn}`);
    }
    if (event.type === "repaired") {
      courses.push(`One hearth, rebuilt turn ${turn}`);
    }
  }
  return courses.map((text, i) => ({
    course: COURSES[Math.min(i, COURSES.length - 1)],
    text,
  }));
}

// The outtakes are the same stream with a filter on it.
export function bloopers(clips: Clip[]): string[] {
  return clips.flatMap(({ event, turn }) =>
    event.type === "blocked" ? [`Turn ${turn}: "${event.line}"`] : []
  );
}

export function compassWord(from: Cell, to: Cell): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const ns = dy < -Math.abs(dx) / 2 ? "N" : dy > Math.abs(dx) / 2 ? "S" : "";
  const ew = dx > Math.abs(dy) / 2 ? "E" : dx < -Math.abs(dy) / 2 ? "W" : "";
  return ns + ew || "HERE";
}

// The fake timecode is formatted from the turn count, so the core still has no clock.
export function timecode(turn: number): string {
  const seconds = 6 * 3600 + 12 * 60 + turn * 7;
  const part = (n: number) => String(n).padStart(2, "0");
  return `${part(Math.floor(seconds / 3600))}:${
    part(Math.floor(seconds / 60) % 60)
  }:${part(seconds % 60)}`;
}
