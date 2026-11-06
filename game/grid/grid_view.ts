// The only folder allowed to import Phaser, and for one job: drawing the grid.
// Input, the HUD, sound, and the order of events all live outside it.
import Phaser from "phaser";
import type { Cell, GameEvent, GameState } from "../../core/mod.ts";
import {
  fixtureAt,
  fixtureCell,
  gridValue,
  nodeAt,
  type NodeId,
  terrainAt,
} from "../../core/mod.ts";
import { TEXTURES } from "../art.ts";

const CELL = 48;
const WALK_MS = 140;
// The view is zoomed so that this many logical pixels always fill the window height.
const LOGICAL_HEIGHT = 720;
// Standing things sort by their y, which goes negative north of the origin, so the
// ground has to sit below any y the chef could reach.
const GROUND_DEPTH = -1_000_000;

export type Pace = { speed: number };

const VARIANTS: Record<string, number> = {
  meadow: 4,
  forest: 3,
  water: 2,
  floor: 3,
  path: 2,
  wall: 2,
  rock: 3,
};

// A new node fails to type-check until it has a picture.
const NODE_ART: Record<NodeId, string> = {
  deadfall: "item_stick",
  thymepatch: "item_thyme",
  ratnap: "ratAsleep",
};

function center({ x, y }: Cell): Cell {
  return { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
}

async function decode(): Promise<Map<string, HTMLImageElement>> {
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    Object.entries(TEXTURES).map(async ([key, svg]) => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await image.decode();
      images.set(key, image);
    }),
  );
  return images;
}

// One output of the presenter. It shows events; it decides nothing.
// Humble Object: http://xunitpatterns.com/Humble%20Object.html
export class GridView extends Phaser.Scene {
  private readonly seed: number;
  private readonly start: Cell;
  private readonly images: Map<string, HTMLImageElement>;
  private readonly pace: Pace;
  // What has been shown so far, which can lag behind what the core knows.
  private readonly taken: Set<string>;
  private readonly repaired: Set<string>;
  private readonly cells = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly nodes = new Map<string, Phaser.GameObjects.Image>();
  private readonly water = new Set<Phaser.GameObjects.Image>();
  private hearth: Phaser.GameObjects.Image | null = null;
  private flame: Phaser.GameObjects.Image | null = null;
  private chef!: Phaser.GameObjects.Image;
  private cameraTarget!: Phaser.GameObjects.Zone;
  private shown: Cell;

  constructor(
    state: GameState,
    images: Map<string, HTMLImageElement>,
    pace: Pace,
  ) {
    super("grid");
    this.seed = state.seed;
    this.start = { ...state.player };
    this.shown = { ...state.player };
    this.images = images;
    this.pace = pace;
    this.taken = new Set(state.taken);
    this.repaired = new Set(state.repaired);
  }

  create() {
    for (const [key, image] of this.images) this.textures.addImage(key, image);
    const { x, y } = center(this.start);
    this.chef = this.add.image(x, y - 8, "chef").setScale(1 / 3)
      .setDepth(y + 4);
    this.cameraTarget = this.add.zone(x, y, 1, 1);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.16, 0.16);
    this.cameras.main.filters.external.addBarrel(1.035);
    this.fitToDisplay();
    addEventListener("resize", () => this.fitToDisplay());

    let phase = 0;
    this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        phase = 1 - phase;
        for (const tile of this.water) tile.setTexture(`water${phase}`);
      },
    });
    this.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => this.puffSmoke(),
    });
  }

  // Phaser has no device-pixel setting of its own. So the canvas backing store is
  // CSS size times devicePixelRatio, the CSS size follows the window, and a camera
  // zoom lets all drawing stay in logical pixels. A projector just changes the zoom.
  private fitToDisplay() {
    const ratio = globalThis.devicePixelRatio || 1;
    const { innerWidth: width, innerHeight: height } = globalThis;
    this.scale.resize(Math.round(width * ratio), Math.round(height * ratio));
    this.scale.canvas.style.width = `${width}px`;
    this.scale.canvas.style.height = `${height}px`;
    this.cameras.main.setZoom((ratio * height) / LOGICAL_HEIGHT);
    this.drawCellsAround(this.shown);
  }

  show(event: GameEvent): Promise<void> | void {
    switch (event.type) {
      case "moved":
        this.shown = { ...event.to };
        this.drawCellsAround(event.to);
        return this.walk(event.from, event.to);
      case "blocked":
        return this.bump(event.at, event.toward);
      case "foraged":
        return this.pickUp(event);
      case "repaired":
        this.repaired.add(event.fixture);
        this.lightHearth();
        this.cameras.main.shake(260 / this.pace.speed, 0.006);
        this.burst(event.toward, "spark", 26);
        return this.wait(900);
      case "cooked":
        this.burst(event.toward, "spark", 40);
        this.cameras.main.zoomTo(
          this.cameras.main.zoom * 1.5,
          1100 / this.pace.speed,
        );
        return this.wait(1500);
      case "plated":
        return;
      default:
        // A new event type fails to type-check here until it has a presentation.
        event satisfies never;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((done) =>
      this.time.delayedCall(ms / this.pace.speed, done)
    );
  }

  private walk(from: Cell, to: Cell): Promise<void> {
    const { x, y } = center(to);
    const duration = WALK_MS / this.pace.speed;
    if (to.x !== from.x) this.chef.setFlipX(to.x < from.x);
    this.chef.setDepth(y + 4);
    this.tweens.add({ targets: this.cameraTarget, x, y, duration });
    // A tiny helmet-cam bob, and a lean for the chef.
    this.tweens.add({
      targets: this.cameras.main.followOffset,
      y: { from: 0, to: -3 },
      duration: duration / 2,
      yoyo: true,
    });
    this.tweens.add({
      targets: this.chef,
      angle: { from: to.x < from.x ? 5 : -5, to: 0 },
      duration,
    });
    return new Promise((done) => {
      this.tweens.add({
        targets: this.chef,
        x,
        y: y - 8,
        duration,
        onComplete: () => done(),
      });
    });
  }

  private bump(at: Cell, toward: Cell): Promise<void> {
    const start = center(at);
    const target = center(toward);
    this.cameras.main.shake(90 / this.pace.speed, 0.003);
    this.chef.setTint(0xff9a8a);
    return new Promise((done) => {
      this.tweens.add({
        targets: this.chef,
        x: start.x + (target.x - start.x) * 0.3,
        y: start.y - 8 + (target.y - start.y) * 0.3,
        duration: 70 / this.pace.speed,
        yoyo: true,
        onComplete: () => {
          this.chef.clearTint();
          done();
        },
      });
    });
  }

  private pickUp(
    event: Extract<GameEvent, { type: "foraged" }>,
  ): Promise<void> {
    const key = `${event.cell.x},${event.cell.y}`;
    this.taken.add(key);
    this.nodes.get(key)?.destroy();
    this.nodes.delete(key);
    const { x, y } = center(event.cell);
    this.burst(event.cell, "leaf", 8);
    const icon = this.add.image(x, y - 16, `item_${event.item}`)
      .setScale(0.3).setDepth(100000);
    return new Promise((done) => {
      this.tweens.add({
        targets: icon,
        y: y - 74,
        scale: 0.42,
        alpha: { from: 1, to: 0 },
        duration: 420 / this.pace.speed,
        onComplete: () => {
          icon.destroy();
          done();
        },
      });
    });
  }

  private burst(cell: Cell, key: string, count: number) {
    const { x, y } = center(cell);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const reach = 24 + (i * 37) % 44;
      const bit = this.add.image(x, y, key).setScale(0.36).setDepth(100000);
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * reach,
        y: y + Math.sin(angle) * reach - 18,
        alpha: 0,
        angle: 240,
        duration: 620 / this.pace.speed,
        onComplete: () => bit.destroy(),
      });
    }
  }

  private lightHearth() {
    this.hearth?.setTexture("hearthLit");
    if (this.flame) return;
    const { x, y } = center(fixtureCell("hearth"));
    this.flame = this.add.image(x, y + 8, "flame").setScale(0.3)
      .setDepth(y + 40);
    this.tweens.add({
      targets: this.flame,
      scaleX: 0.36,
      scaleY: 0.26,
      duration: 130,
      yoyo: true,
      repeat: -1,
    });
  }

  private puffSmoke() {
    if (!this.flame) return;
    const { x, y } = center(fixtureCell("hearth"));
    const puff = this.add.image(x + 1, y - 40, "smoke")
      .setScale(0.14).setAlpha(0.65).setDepth(100000);
    this.tweens.add({
      targets: puff,
      x: x + 16,
      y: y - 92,
      scale: 0.42,
      alpha: 0,
      duration: 1500,
      onComplete: () => puff.destroy(),
    });
  }

  // Keep only what is near the camera, adding and dropping a strip per step. Asking
  // the core again costs little, and the world itself is never stored.
  private drawCellsAround({ x: cx, y: cy }: Cell) {
    const zoom = this.cameras.main.zoom || 1;
    const across = Math.ceil(this.scale.width / zoom / CELL / 2) + 3;
    const down = Math.ceil(this.scale.height / zoom / CELL / 2) + 3;
    for (const [key, objects] of this.cells) {
      const [x, y] = key.split(",").map(Number);
      if (Math.abs(x - cx) <= across + 2 && Math.abs(y - cy) <= down + 2) {
        continue;
      }
      for (const object of objects) {
        this.water.delete(object);
        if (object === this.hearth) this.hearth = null;
        object.destroy();
      }
      this.cells.delete(key);
      this.nodes.delete(key);
    }
    for (let y = cy - down; y <= cy + down; y++) {
      for (let x = cx - across; x <= cx + across; x++) {
        if (!this.cells.has(`${x},${y}`)) this.drawCell(x, y);
      }
    }
  }

  private drawCell(x: number, y: number) {
    const terrain = terrainAt(this.seed, x, y);
    const key = `${x},${y}`;
    const left = x * CELL;
    const top = y * CELL;
    const bottom = top + CELL;
    const pick = (name: string) =>
      `${name}${Math.floor(gridValue(this.seed, x, y) * VARIANTS[name])}`;
    const tile = (texture: string) =>
      this.add.image(left, top, texture).setOrigin(0).setScale(1 / 3)
        .setDepth(GROUND_DEPTH);
    const standing = (texture: string) =>
      this.add.image(left + CELL / 2, bottom, texture).setOrigin(0.5, 1)
        .setScale(1 / 3).setDepth(bottom);
    const objects: Phaser.GameObjects.Image[] = [];

    switch (terrain) {
      case "water": {
        const image = tile("water0");
        this.water.add(image);
        objects.push(image);
        break;
      }
      case "wall":
        objects.push(tile("floor0"), standing(pick("wall")));
        break;
      case "counter":
        objects.push(tile(pick("floor")), standing("counter"));
        break;
      case "rock":
        objects.push(tile(pick("meadow")), standing(pick("rock")));
        break;
      default:
        objects.push(tile(pick(terrain)));
    }

    const fixture = fixtureAt(x, y);
    if (fixture) {
      const lit = this.repaired.has(fixture);
      this.hearth = standing(lit ? "hearthLit" : "hearthBroken");
      objects.push(this.hearth);
      if (lit) this.lightHearth();
    }

    const node = this.taken.has(key) ? null : nodeAt(this.seed, x, y);
    if (node) {
      const image = this.nodeImage(node, left, top);
      this.nodes.set(key, image);
      objects.push(image);
    } else if (terrain === "forest" && Math.hypot(x, y) > 8) {
      if (gridValue(this.seed + 23, x, y) < 0.36) {
        objects.push(standing("pine"));
      }
    }
    this.cells.set(key, objects);
  }

  private nodeImage(node: NodeId, left: number, top: number) {
    const texture = NODE_ART[node];
    const image = this.add.image(left + CELL / 2, top + CELL / 2, texture)
      .setScale(texture === "ratAsleep" ? 0.42 : 0.3).setDepth(top + CELL - 1);
    this.tweens.add({
      targets: image,
      y: top + CELL / 2 - 3,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    return image;
  }
}

// Resolves once Phaser has booted and the scene exists. Phaser's input and audio
// are off: this project only asks it to draw.
export async function startGridView(
  parent: HTMLElement,
  state: GameState,
  pace: Pace,
): Promise<GridView> {
  const images = await decode();
  return new Promise((ready) => {
    const view = new GridView(state, images, pace);
    new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
      backgroundColor: "#16120d",
      banner: false,
      audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      scene: view,
      callbacks: {
        postBoot: () => ready(view),
      },
    });
  });
}
