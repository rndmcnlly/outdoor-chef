import {
  type Advice,
  fixtureAt,
  FIXTURES,
  type GameEvent,
  type GameState,
  type ItemId,
  ITEMS,
  nextStep,
  RECIPES,
  terrainAt,
} from "../core/mod.ts";
import { ICONS, PLATE } from "./art.ts";
import {
  bloopers,
  type Clip,
  compassWord,
  pompous,
  raw,
  tastingMenu,
  TERROIR,
  timecode,
} from "./footage.ts";
import type { Pace } from "./grid/grid_view.ts";

const TURNS_PER_DAY = 60;

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function iconHtml(item: ItemId): string {
  return ICONS[item].replace(/width="\d+" height="\d+"/, 'class="icon"');
}

function dayOf(turn: number): number {
  return 1 + Math.floor(turn / TURNS_PER_DAY);
}

function adviceText(advice: Advice): string {
  switch (advice.kind) {
    case "forage":
      return `Forage: ${ITEMS[advice.item].name}`;
    case "repair":
      return "Back inside. Walk into the hearth to fix it.";
    case "cook":
      return "To the hearth. Walk into it to cook.";
    case "served":
      return "Service is over.";
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. show() plays one event; settled() reconciles with the core, which
// is safe only when nothing is playing, because the core is ahead during playback.
export class Hud {
  private readonly state: GameState;
  private readonly pace: Pace;
  private readonly clips: Clip[] = [];
  private turn: number;
  private rawMode = false;

  constructor(state: GameState, pace: Pace) {
    this.state = state;
    this.pace = pace;
    this.turn = state.turn;
    // The seed as an episode number: load it twice and the same forest appears.
    element("episode").textContent = `S04E${state.seed}`;
    addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey) {
        this.toggleRaw();
      }
    });
    element("footage-toggle").addEventListener("click", (event) => {
      this.toggleRaw();
      (event.currentTarget as HTMLElement).blur();
    });
    this.settled();
  }

  // Footage from before the show started: fast-forwarded, not played.
  ingest(events: GameEvent[], turn: number) {
    for (const event of events) {
      this.clips.push({ event, turn });
      this.write(event, turn);
    }
  }

  show(event: GameEvent): Promise<void> | void {
    if (event.type === "moved") this.turn++;
    this.clips.push({ event, turn: this.turn });
    this.write(event, this.turn);
    this.showFrame();
    if (event.type === "moved") this.showPlace(event.to.x, event.to.y);
    if (event.type === "plated") return this.showEnding(event);
  }

  settled() {
    if (this.state.review) return;
    this.showBag();
    this.showTicket();
    this.showCompass(nextStep(this.state));
    this.showPlace(this.state.player.x, this.state.player.y);
    this.showFrame();
  }

  private write(event: GameEvent, turn: number) {
    const line = pompous(event, turn);
    if (line) {
      element("live").textContent = line;
      this.addEntry(element("log-pompous"), `Day ${dayOf(turn)}.`, line);
    }
    this.addEntry(
      element("log-raw"),
      String(turn).padStart(3, "0"),
      raw(event),
    );
  }

  private addEntry(list: HTMLElement, tag: string, text: string) {
    const item = document.createElement("li");
    const label = document.createElement("b");
    label.textContent = tag;
    item.append(label, ` ${text}`);
    list.append(item);
    while (list.children.length > 60) list.firstElementChild!.remove();
    list.scrollTop = list.scrollHeight;
  }

  private toggleRaw() {
    this.rawMode = !this.rawMode;
    document.body.classList.toggle("raw", this.rawMode);
    element("footage-toggle").textContent = this.rawMode
      ? "F: Narrator"
      : "F: Raw Footage";
    element("log-title").textContent = this.rawMode
      ? "RAW_FOOTAGE.jsonl"
      : "Camp Log";
    for (const id of ["log-pompous", "log-raw"]) {
      element(id).scrollTop = element(id).scrollHeight;
    }
  }

  private showFrame() {
    element("timecode").textContent = timecode(this.turn);
    const charge = Math.max(3, 100 - Math.floor(this.turn / 2));
    element("battery-level").style.width = `${charge}%`;
    element("battery-text").textContent = `${charge}%`;
    element("day").textContent = `DAY ${dayOf(this.turn)}`;
  }

  private showPlace(x: number, y: number) {
    const fixture = fixtureAt(x, y);
    element("place").textContent = fixture
      ? FIXTURES[fixture].name
      : TERROIR[terrainAt(this.state.seed, x, y)];
  }

  private showBag() {
    const items = Object.entries(this.state.inventory) as [ItemId, number][];
    element("bag").innerHTML = items.length === 0
      ? `<li class="empty">Nothing. A chef and his opinions.</li>`
      : items.map(([item, n]) =>
        `<li title="${ITEMS[item].note}">${iconHtml(item)}<span>${
          ITEMS[item].name
        }</span><b>${n}</b></li>`
      ).join("");
  }

  private showTicket() {
    const repaired = this.state.repaired.includes("hearth");
    const needs = repaired ? RECIPES.dish.inputs : FIXTURES.hearth.repair;
    element("ticket-title").textContent = repaired
      ? "RAT-ON-A-STICK"
      : "FIX THE HEARTH";
    element("ticket-sub").textContent = repaired
      ? "Bois sauvage. Fire."
      : "Before service. Walk into it.";
    element("ticket-lines").innerHTML = Object.entries(needs).map(
      ([key, need]) => {
        const item = key as ItemId;
        const have = Math.min(this.state.inventory[item] ?? 0, need);
        return `<li class="${have >= need ? "got" : ""}">${
          iconHtml(item)
        }<span>${ITEMS[item].name}</span><b>${have}/${need}</b></li>`;
      },
    ).join("");
  }

  private showCompass(advice: Advice) {
    element("order").textContent = adviceText(advice);
    if (advice.kind === "served") return;
    const { player } = this.state;
    const { cell } = advice;
    const angle = Math.atan2(cell.x - player.x, player.y - cell.y);
    const paces = Math.abs(cell.x - player.x) + Math.abs(cell.y - player.y);
    element("needle").style.transform = `rotate(${angle}rad)`;
    element("bearing").textContent = `${compassWord(player, cell)} ${paces}`;
  }

  private showEnding(
    event: Extract<GameEvent, { type: "plated" }>,
  ): Promise<void> {
    const { review } = event;
    const outtakes = bloopers(this.clips);
    element("plate").innerHTML = PLATE;
    element("review-guide").textContent = review.guide;
    element("review-award").textContent = review.award;
    for (let i = 0; i < 3; i++) {
      const cone = document.createElement("span");
      cone.className = i < review.pinecones ? "cone won" : "cone";
      element("review-cones").append(cone);
    }
    element("menu").innerHTML = tastingMenu(this.clips).map(
      ({ course, text }) => `<li><i>${course}</i> ${text}</li>`,
    ).join("");
    element("stats").textContent =
      `${review.steps} paces. ${this.state.taken.length} withdrawals from the forest floor, none reported.`;
    element("outtakes").innerHTML = outtakes.length > 0
      ? outtakes.map((line) => `<li>${line}</li>`).join("")
      : "<li>None. Suspicious. Dale is checking the tape.</li>";
    element("ending").hidden = false;
    document.body.classList.add("ended");
    return new Promise((done) => setTimeout(done, 400 / this.pace.speed));
  }
}
