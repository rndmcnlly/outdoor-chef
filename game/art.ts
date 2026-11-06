// All the art in the game, hand-written as SVG strings. The same icon draws on the
// map and in the page, because Phaser and the HUD both just decode an image.
// Keyed by the core's item ids, so a new item fails to type-check until it has art.

import type { ItemId } from "../core/mod.ts";

const INK = "#20140b";

function svg(w: number, h: number, body: string, scale = 3): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${
    w * scale
  }" height="${h * scale}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

// A tiny local shuffle, so scattered details differ between tile variants.
function scatter(
  seed: number,
  n: number,
  each: (x: number, y: number, r: number) => string,
) {
  let out = "";
  let s = seed * 9301 + 49297;
  const next = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    out += each(next() * 44 + 2, next() * 44 + 2, next());
  }
  return out;
}

function meadow(seed: number): string {
  return svg(
    48,
    48,
    `<rect width="48" height="48" fill="#6aa544"/>` +
      scatter(
        seed,
        9,
        (x, y) =>
          `<path d="M${x} ${y}l-1.6 -4M${x} ${y}l0 -5M${x} ${y}l1.6 -4" stroke="#4c8533" stroke-width="1.2" stroke-linecap="round"/>`,
      ) +
      scatter(
        seed + 7,
        seed % 2 ? 3 : 1,
        (x, y, r) =>
          `<circle cx="${x}" cy="${y}" r="1.7" fill="${
            r > .5 ? "#f6e27a" : "#f4f1e4"
          }"/>`,
      ),
  );
}

function forest(seed: number): string {
  return svg(
    48,
    48,
    `<rect width="48" height="48" fill="#3a6f3c"/>` +
      scatter(
        seed,
        7,
        (x, y, r) =>
          `<ellipse cx="${x}" cy="${y}" rx="${3 + r * 3}" ry="${
            1.5 + r
          }" fill="#2d5a32"/>`,
      ) +
      scatter(
        seed + 3,
        4,
        (x, y) =>
          `<path d="M${x} ${y}q-4 -5 -6 -2M${x} ${y}q4 -5 6 -2M${x} ${y}l0 -6" stroke="#5a9450" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
      ),
  );
}

function water(phase: number): string {
  const lines = [6, 20, 34].map((y, i) => {
    const x = (i * 17 + phase * 9) % 30 + 4;
    return `<path d="M${x} ${
      y + phase * 2
    }q4 -3 8 0t8 0" stroke="#9fd6ef" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".75"/>`;
  }).join("");
  return svg(
    48,
    48,
    `<rect width="48" height="48" fill="#2f77ae"/><rect width="48" height="48" fill="#1e5d90" opacity="${
      phase ? .25 : 0
    }"/>${lines}`,
  );
}

function floor(seed: number): string {
  const boards = [0, 16, 32].map((y, i) => {
    const shade = ["#c08d55", "#b58049", "#c9975f"][(i + seed) % 3];
    const seam = ((seed + i) * 13) % 36 + 6;
    return `<rect y="${y}" width="48" height="16" fill="${shade}"/>
      <path d="M0 ${y + 5}q12 2 24 0t24 0M3 ${
      y + 11
    }q14 -2 30 0" stroke="#92643a" stroke-width=".8" fill="none" opacity=".7"/>
      <path d="M0 ${y + .5}h48" stroke="#6d4526" stroke-width="1.4"/>
      <path d="M${seam} ${y}v16" stroke="#6d4526" stroke-width="1.2"/>
      <circle cx="${seam + 3}" cy="${
      y + 3
    }" r=".9" fill="#3e2714"/><circle cx="${seam - 3}" cy="${
      y + 13
    }" r=".9" fill="#3e2714"/>`;
  }).join("");
  return svg(48, 48, boards);
}

function pathTile(seed: number): string {
  return svg(
    48,
    48,
    `<rect width="48" height="48" fill="#6aa544"/><rect x="7" width="34" height="48" fill="#a98657"/>` +
      scatter(
        seed,
        8,
        (x, y) =>
          `<circle cx="${x * .6 + 10}" cy="${y}" r="1.3" fill="#8b6c43"/>`,
      ),
  );
}

// A dark, reddish log wall: a different wood from the pale floor, on purpose.
function wall(seed: number): string {
  const logs = [10, 24, 38, 52].map((y, i) => {
    const notch = (seed + i) % 2 ? 38 : 12;
    return `<rect x="-2" y="${y}" width="52" height="14" rx="6" fill="#5f2e1b" stroke="${INK}" stroke-width="1.6"/>
      <path d="M2 ${
      y + 5
    }q20 -3 44 0" stroke="#864a2c" stroke-width="1.6" fill="none"/>
      <circle cx="${notch}" cy="${y + 8}" r="2.4" fill="#401d10"/>`;
  }).join("");
  return svg(
    48,
    68,
    `<rect y="0" width="48" height="12" fill="#7d4426"/><path d="M0 2h48M0 7h48" stroke="#a76a3d" stroke-width="1.6"/><path d="M0 11.5h48" stroke="${INK}" stroke-width="1.5"/>${logs}`,
  );
}

function rock(seed: number): string {
  const lean = seed * 4;
  return svg(
    48,
    62,
    `<ellipse cx="24" cy="54" rx="23" ry="7" fill="#000" opacity=".25"/>
    <path d="M4 52 L${6 + lean} 22 L${
      22 + lean
    } 8 L40 18 L45 52 Q24 60 4 52Z" fill="#7c7a78" stroke="${INK}" stroke-width="2"/>
    <path d="M${22 + lean} 8 L40 18 L28 28 L${6 + lean} 22Z" fill="#a5a29e"/>
    <path d="M28 28 L26 46M16 34l-3 12" stroke="#55534f" stroke-width="1.8" fill="none"/>`,
  );
}

const PINE = svg(
  56,
  92,
  `<ellipse cx="28" cy="84" rx="19" ry="6" fill="#000" opacity=".28"/>
  <rect x="24" y="66" width="8" height="20" fill="#50301a" stroke="${INK}" stroke-width="1.6"/>
  <path d="M28 44 L52 72 Q28 80 4 72Z" fill="#1f5a39" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M28 24 L46 52 Q28 60 10 52Z" fill="#2a6d45" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M28 4 L40 32 Q28 38 16 32Z" fill="#378255" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
);

const COUNTER = svg(
  48,
  62,
  `<rect x="5" y="38" width="6" height="20" fill="#3b2412"/><rect x="37" y="38" width="6" height="20" fill="#3b2412"/>
  <rect x="1" y="14" width="46" height="28" rx="2" fill="#dcc08f" stroke="${INK}" stroke-width="2"/>
  <path d="M1 24h46M1 33h46M16 14v10M32 24v9" stroke="#a38456" stroke-width="1.1"/>
  <rect x="1" y="40" width="46" height="6" fill="#8e6a3d" stroke="${INK}" stroke-width="1.5"/>`,
);

const stone = (x: number, y: number, r: number, fill = "#8a8580") =>
  `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${
    r * .78
  }" fill="${fill}" stroke="${INK}" stroke-width="1.8"/>`;

const HEARTH_BROKEN = svg(
  64,
  84,
  `<ellipse cx="32" cy="76" rx="28" ry="7" fill="#000" opacity=".22"/>
  ${stone(10, 68, 8)}${stone(26, 70, 7, "#77726d")}${stone(46, 70, 9)}${
    stone(57, 62, 6, "#77726d")
  }
  ${stone(14, 54, 7, "#6f6a66")}${stone(36, 58, 8)}
  <path d="M10 46 L12 16 L26 12 L24 30 L34 24 L30 44Z" fill="#6d6864" stroke="${INK}" stroke-width="2"/>
  <path d="M15 22l4 8-3 6" stroke="#35302c" stroke-width="1.6" fill="none"/>
  <path d="M40 66l6-10 8 3-4 9z" fill="#2a241f"/>
  <path d="M30 8q6 -6 10 -2" stroke="#b5ada3" stroke-width="2" fill="none" stroke-dasharray="2 3"/>`,
);

const HEARTH_LIT = svg(
  64,
  84,
  `<ellipse cx="32" cy="76" rx="29" ry="7" fill="#000" opacity=".25"/>
  <path d="M18 34 L20 4 H44 L46 34Z" fill="#7f7a75" stroke="${INK}" stroke-width="2"/>
  <path d="M21 13h22M20 24h24M30 4v9M36 13v11M26 24v10M39 24v10" stroke="#4d4843" stroke-width="1.5"/>
  <path d="M5 74 V40 Q5 30 16 30 H48 Q59 30 59 40 V74 Z" fill="#8d8882" stroke="${INK}" stroke-width="2.2"/>
  <path d="M15 74 V50 Q15 41 32 41 Q49 41 49 50 V74Z" fill="#1c130d" stroke="${INK}" stroke-width="2"/>
  <path d="M5 42h10M49 42h10M5 56h10M49 56h10M5 66h10M49 66h10M22 36v-6M42 36v-6" stroke="#4d4843" stroke-width="1.5"/>
  <path d="M20 74h24" stroke="#5a3a1d" stroke-width="5" stroke-linecap="round"/>
  <path d="M6 30q10 -4 16 0M42 30q10 -4 16 0" stroke="#d9d3c9" stroke-width="2" fill="none" opacity=".5"/>
  <rect x="10" y="75" width="44" height="3" fill="#bc8751"/>`,
);

const FLAME = svg(
  32,
  40,
  `<path d="M16 2 C20 12 29 17 28 28 C27 36 21 39 16 39 C10 39 4 36 4 27 C4 20 10 19 11 11 C13 13 15 9 16 2Z" fill="#f38a1d" stroke="#8d2c07" stroke-width="1.5"/>
  <path d="M16 16 C18 22 23 25 22 31 C21 36 18 38 16 38 C12 38 9 35 10 30 C11 26 15 24 16 16Z" fill="#ffd945"/>`,
);

const SMOKE = svg(24, 24, `<circle cx="12" cy="12" r="10" fill="#d9d4cc"/>`);

const SPARK = svg(8, 8, `<circle cx="4" cy="4" r="3.5" fill="#ffd34d"/>`);

const LEAF = svg(
  10,
  10,
  `<path d="M1 9 Q2 2 9 1 Q8 8 1 9Z" fill="#7cc44d" stroke="${INK}" stroke-width="1"/>`,
);

// A top-down-and-a-bit chef with a mustache, an apron, and a camera bolted to the toque.
const CHEF = svg(
  48,
  66,
  `<ellipse cx="24" cy="60" rx="15" ry="5" fill="#000" opacity=".3"/>
  <rect x="15" y="50" width="7" height="9" rx="2" fill="#26211d"/><rect x="26" y="50" width="7" height="9" rx="2" fill="#26211d"/>
  <path d="M12 33 Q24 26 36 33 L37 53 H11Z" fill="#f4f1e8" stroke="${INK}" stroke-width="2"/>
  <path d="M17 34 L31 34 L33 53 H15Z" fill="#c9423a" stroke="${INK}" stroke-width="1.3"/>
  <circle cx="24" cy="39" r="1.3" fill="#f4f1e8"/><circle cx="24" cy="45" r="1.3" fill="#f4f1e8"/>
  <rect x="7" y="34" width="6" height="14" rx="3" fill="#f4f1e8" stroke="${INK}" stroke-width="1.8"/>
  <rect x="35" y="34" width="6" height="14" rx="3" fill="#f4f1e8" stroke="${INK}" stroke-width="1.8"/>
  <circle cx="24" cy="24" r="10.5" fill="#efc095" stroke="${INK}" stroke-width="2"/>
  <circle cx="20" cy="22" r="1.5" fill="${INK}"/><circle cx="28" cy="22" r="1.5" fill="${INK}"/>
  <path d="M15 28 Q20 24 24 28 Q28 24 33 28 Q29 31 24 29 Q19 31 15 28Z" fill="#2a170b"/>
  <path d="M12 16 Q7 6 15 5 Q17 -1 24 2 Q31 -1 33 5 Q41 6 36 16Z" fill="#fffdf7" stroke="${INK}" stroke-width="2"/>
  <rect x="13" y="13" width="22" height="5" rx="1" fill="#e7e1d2" stroke="${INK}" stroke-width="1.5"/>
  <rect x="19" y="8" width="10" height="8" rx="1.5" fill="#23262b" stroke="#000" stroke-width="1"/>
  <circle cx="24" cy="12" r="2.7" fill="#6db7e6" stroke="#000" stroke-width="1"/><circle cx="27.5" cy="9.5" r=".8" fill="#ff3b30"/>`,
);

export const ICONS: Record<ItemId, string> = {
  stick: svg(
    48,
    48,
    `<path d="M6 42 L40 8" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M6 42 L40 8" stroke="#9a6a38" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M24 24 L34 28" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M24 24 L34 28" stroke="#9a6a38" stroke-width="3" stroke-linecap="round"/>
    <path d="M12 34 L24 22" stroke="#c49a63" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  thyme: svg(
    48,
    48,
    `<path d="M24 44 Q22 24 26 6" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M24 44 Q22 24 26 6" stroke="#6b5a2e" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      [[24, 38], [23, 30], [24, 22], [25, 14], [26, 8]].map(([x, y]) =>
        `<ellipse cx="${x - 7}" cy="${
          y - 2
        }" rx="6" ry="3.2" fill="#6fb24d" stroke="${INK}" stroke-width="1.4" transform="rotate(-24 ${
          x - 7
        } ${y - 2})"/>
       <ellipse cx="${x + 7}" cy="${
          y - 3
        }" rx="6" ry="3.2" fill="#88c95f" stroke="${INK}" stroke-width="1.4" transform="rotate(24 ${
          x + 7
        } ${y - 3})"/>`
      ).join(""),
  ),
  rat: svg(
    48,
    48,
    `<path d="M9 34 Q0 40 3 28" stroke="#d98d94" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M7 36 C7 20 26 14 37 25 L46 33 Q38 41 26 40 H12 Q7 40 7 36Z" fill="#8c8179" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="29" cy="21" r="5.4" fill="#e5a3a8" stroke="${INK}" stroke-width="2"/>
    <path d="M33 29 l4 -1" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="46" cy="33" r="1.8" fill="#e5707c" stroke="${INK}" stroke-width="1"/>
    <path d="M42 36l5 3M41 37l3 5" stroke="${INK}" stroke-width=".9"/>`,
  ),
  dish: svg(
    48,
    48,
    `<circle cx="24" cy="24" r="21" fill="#fbf7ec" stroke="${INK}" stroke-width="2"/><circle cx="24" cy="24" r="16" fill="none" stroke="#c9a54b" stroke-width="1.2"/>
    <path d="M9 39 L39 9" stroke="#7b4f26" stroke-width="3.2" stroke-linecap="round"/>
    <ellipse cx="24" cy="24" rx="11" ry="6.2" fill="#6d4023" stroke="${INK}" stroke-width="1.8" transform="rotate(-45 24 24)"/>
    <path d="M16 34q-5 -1 -5 5" stroke="#d98d94" stroke-width="2" fill="none"/>`,
  ),
};

// A sleeping rat, for the map: the same fellow, plus a very small snore.
const RAT_ASLEEP = svg(
  48,
  48,
  `<ellipse cx="24" cy="42" rx="20" ry="4" fill="#000" opacity=".25"/>
  <path d="M9 38 Q0 44 3 32" stroke="#d98d94" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M7 40 C7 24 26 18 37 29 L46 37 Q38 45 26 44 H12 Q7 44 7 40Z" fill="#8c8179" stroke="${INK}" stroke-width="2.2"/>
  <circle cx="29" cy="25" r="5.4" fill="#e5a3a8" stroke="${INK}" stroke-width="2"/>
  <path d="M33 33 q2 2 4 0" stroke="${INK}" stroke-width="1.8" fill="none"/>
  <text x="34" y="14" font-family="Georgia, serif" font-size="11" font-weight="700" fill="#fff" stroke="${INK}" stroke-width=".6">z</text>
  <text x="41" y="8" font-family="Georgia, serif" font-size="8" font-weight="700" fill="#fff" stroke="${INK}" stroke-width=".5">z</text>`,
);

export const TEXTURES: Record<string, string> = {
  meadow0: meadow(1),
  meadow1: meadow(2),
  meadow2: meadow(3),
  meadow3: meadow(4),
  forest0: forest(5),
  forest1: forest(6),
  forest2: forest(7),
  water0: water(0),
  water1: water(1),
  floor0: floor(0),
  floor1: floor(1),
  floor2: floor(2),
  path0: pathTile(1),
  path1: pathTile(2),
  wall0: wall(0),
  wall1: wall(1),
  rock0: rock(0),
  rock1: rock(1),
  rock2: rock(2),
  counter: COUNTER,
  pine: PINE,
  chef: CHEF,
  hearthBroken: HEARTH_BROKEN,
  hearthLit: HEARTH_LIT,
  flame: FLAME,
  smoke: SMOKE,
  spark: SPARK,
  leaf: LEAF,
  ratAsleep: RAT_ASLEEP,
  item_stick: ICONS.stick,
  item_thyme: ICONS.thyme,
  item_rat: ICONS.rat,
  item_dish: ICONS.dish,
};

export const PLATE = `
  <svg viewBox="0 0 400 400" role="img" aria-label="The plated rat-on-a-stick">
    <defs><radialGradient id="pl" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fffef8"/><stop offset="1" stop-color="#e9e1cd"/></radialGradient></defs>
    <ellipse cx="200" cy="214" rx="186" ry="178" fill="#000" opacity=".35"/>
    <circle cx="200" cy="200" r="182" fill="url(#pl)" stroke="#5a4522" stroke-width="3"/>
    <circle cx="200" cy="200" r="172" fill="none" stroke="#c6a24a" stroke-width="3"/>
    <circle cx="200" cy="200" r="120" fill="none" stroke="#efe6cf" stroke-width="2"/>
    <path d="M92 278 C150 330 280 330 330 250 C290 300 170 300 92 278Z" fill="#3c2412" opacity=".8"/>
    <g fill="#67522b"><circle cx="110" cy="210" r="3"/><circle cx="128" cy="186" r="2"/><circle cx="96" cy="182" r="2.4"/><circle cx="298" cy="136" r="3"/><circle cx="318" cy="166" r="2"/></g>
    <path d="M70 330 L330 70" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M70 330 L330 70" stroke="#a06f3a" stroke-width="9" stroke-linecap="round"/>
    <path d="M318 82 L334 66" stroke="#e4c690" stroke-width="7" stroke-linecap="round"/>
    <g transform="rotate(-45 200 200)">
      <path d="M92 202 Q70 216 44 200 Q30 192 22 200" stroke="#c97680" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M90 200 C96 150 240 140 292 192 L322 200 L292 214 C240 262 96 250 90 200Z" fill="#7a4524" stroke="${INK}" stroke-width="5"/>
      <path d="M116 172 C170 150 240 158 280 188" stroke="#b97b42" stroke-width="10" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M140 210l18 28M170 208l14 32M200 208l10 30M228 204l8 26" stroke="#2a1608" stroke-width="5" stroke-linecap="round"/>
      <circle cx="238" cy="150" r="17" fill="#a4615a" stroke="${INK}" stroke-width="4"/>
      <circle cx="238" cy="150" r="8" fill="#d98d94"/>
      <circle cx="240" cy="246" r="14" fill="#a4615a" stroke="${INK}" stroke-width="4"/>
      <path d="M266 182l10 10M276 182l-10 10" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <path d="M312 190l18 -12M314 208l18 12" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="322" cy="200" r="6" fill="#e0737f" stroke="${INK}" stroke-width="2.5"/>
    </g>
    <g fill="#5e9c3c" stroke="${INK}" stroke-width="1.5">
      <path d="M100 120 Q140 90 170 92" stroke="#5a4a22" stroke-width="4" fill="none"/>
      ${
  [[112, 108], [126, 100], [142, 94], [158, 92]].map(([x, y]) =>
    `<ellipse cx="${x}" cy="${y - 8}" rx="8" ry="4.5"/><ellipse cx="${
      x + 4
    }" cy="${y + 8}" rx="8" ry="4.5"/>`
  ).join("")
}
    </g>
    <g fill="#fff"><circle cx="262" cy="290" r="3.5"/><circle cx="276" cy="276" r="2.5"/><circle cx="288" cy="298" r="3"/></g>
    <g class="steam" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".75">
      <path d="M180 120 q-16 -24 0 -46 q16 -22 0 -46"/><path d="M226 110 q-16 -24 0 -46 q16 -22 0 -46"/>
    </g>
  </svg>`;

export const PANEL_DROP = `
  <svg viewBox="0 0 480 320" role="img" aria-label="A chef dropped from a helicopter over a forest">
    <rect width="480" height="320" fill="#f0a24a"/>
    <circle cx="372" cy="104" r="62" fill="#ffd97a"/>
    <g fill="none" stroke="#e7863a" stroke-width="10" opacity=".7"><path d="M-10 60 Q240 110 500 40"/><path d="M-10 140 Q240 170 500 118"/></g>
    <g transform="translate(70 26)">
      <path d="M0 50 q0 -30 60 -32 h60 q30 2 44 30 l80 -12 -6 18 -76 16 q-28 16 -86 14 q-56 -2 -76 -34Z" fill="#1f2b2e" stroke="#0d1214" stroke-width="3"/>
      <path d="M26 50 q6 -22 36 -24 l0 26Z" fill="#9fd9f0"/>
      <path d="M-46 4 H210" stroke="#0d1214" stroke-width="6" stroke-linecap="round"/><path d="M82 4 V18" stroke="#0d1214" stroke-width="7"/>
      <path d="M36 92 H130M50 78 V92M118 78 V92" stroke="#0d1214" stroke-width="5"/>
    </g>
    <path d="M150 120 V192" stroke="#fff" stroke-width="3" stroke-dasharray="7 5"/>
    <g transform="translate(120 180) scale(1.25)">
      <rect x="15" y="50" width="7" height="12" rx="2" fill="#26211d"/><rect x="26" y="50" width="7" height="12" rx="2" fill="#26211d"/>
      <path d="M12 33 Q24 26 36 33 L37 53 H11Z" fill="#f4f1e8" stroke="${INK}" stroke-width="2"/>
      <path d="M8 40 L0 22M40 40 L48 22" stroke="#f4f1e8" stroke-width="6" stroke-linecap="round"/>
      <circle cx="24" cy="24" r="10.5" fill="#efc095" stroke="${INK}" stroke-width="2"/>
      <circle cx="20" cy="23" r="2.2" fill="${INK}"/><circle cx="28" cy="23" r="2.2" fill="${INK}"/><ellipse cx="24" cy="30" rx="3" ry="2.6" fill="${INK}"/>
      <path d="M12 16 Q7 6 15 5 Q17 -1 24 2 Q31 -1 33 5 Q41 6 36 16Z" fill="#fffdf7" stroke="${INK}" stroke-width="2"/>
      <rect x="19" y="8" width="10" height="8" rx="1.5" fill="#23262b"/><circle cx="24" cy="12" r="2.7" fill="#6db7e6"/>
    </g>
    <g fill="#1d4a30" stroke="#0e2a1a" stroke-width="3">${
  [0, 60, 120, 180, 240, 300, 360, 420].map((x, i) =>
    `<path d="M${x - 10} 320 L${x + 30} ${232 + (i % 3) * 18} L${
      x + 70
    } 320Z"/>`
  ).join("")
}</g>
  </svg>`;

export const PANEL_SHACK = `
  <svg viewBox="0 0 480 320" role="img" aria-label="A collapsing wooden shack in the forest">
    <rect width="480" height="320" fill="#79b4c9"/>
    <g fill="#2a6d45" stroke="#0e2a1a" stroke-width="3">${
  [-20, 70, 340, 420].map((x, i) =>
    `<path d="M${x - 40} 280 L${x + 20} ${90 + i * 14} L${x + 80} 280Z"/>`
  ).join("")
}</g>
    <rect y="262" width="480" height="58" fill="#5e9a3f"/>
    <path d="M214 320 L232 234 H270 L296 320Z" fill="#a98657"/>
    <path d="M310 80 v-50 h24 v62" fill="#7f7a75" stroke="${INK}" stroke-width="4" transform="rotate(14 320 80)"/>
    <g transform="rotate(-3 240 180)">
      <rect x="120" y="128" width="240" height="130" fill="#5f2e1b" stroke="${INK}" stroke-width="4"/>
      <path d="M120 154h240M120 180h240M120 206h240M120 232h240" stroke="${INK}" stroke-width="3"/>
      <path d="M96 138 L240 54 L384 142 L372 158 L240 82 L112 158Z" fill="#c9975f" stroke="${INK}" stroke-width="4"/>
      <path d="M170 124l40 -22 6 12 -40 20z" fill="#79b4c9" stroke="${INK}" stroke-width="3"/>
      <rect x="224" y="178" width="46" height="80" fill="#1c130d" stroke="${INK}" stroke-width="4"/>
      <rect x="140" y="170" width="52" height="44" fill="#1c130d" stroke="${INK}" stroke-width="4"/><path d="M140 170 L192 214M192 170 L140 214" stroke="#c9975f" stroke-width="6"/>
      <rect x="298" y="172" width="42" height="38" fill="#79b4c9" stroke="${INK}" stroke-width="4"/><path d="M319 172V210" stroke="${INK}" stroke-width="3"/>
    </g>
    <g transform="translate(366 204)"><rect x="0" y="0" width="86" height="48" fill="#f4f1e8" stroke="${INK}" stroke-width="3"/><path d="M38 48V74" stroke="${INK}" stroke-width="5"/>
    <text x="43" y="20" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-weight="700" fill="#20140b">KITCHEN</text><text x="43" y="37" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#20140b">(concept)</text></g>
  </svg>`;
