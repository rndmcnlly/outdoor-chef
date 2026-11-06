# Outdoor Chef Survival Challenge

A vertical slice, grown from the CMPM 121 D3 starter to show how much creative pressure its architecture can take. A chef is dropped in a forest with a camera bolted to the toque. Forage outside, repair the shack's hearth, and cook an exquisite rat-on-a-stick. Takes about 90 seconds.

Arrow keys are the whole control scheme: walk over things to take them, and walk into the hearth to fix it or cook on it. **F** swaps the pompous camp log for the raw event stream.

## Run it

```sh
deno task setup      # once: installs dependencies
deno task ci         # every gate, and builds dist/
deno task preview    # serves dist/, no network needed after setup
```

| URL                | What it does                                                                           |
| ------------------ | -------------------------------------------------------------------------------------- |
| `/`                | The opening panels, then the game. Enter advances.                                     |
| `/?seed=7`         | Another forest, same shack.                                                            |
| `/?replay&speed=3` | The recorded winning run, pressed through the keyboard path. `+` and `-` change speed. |
| `/?skip=plate`     | One step before the ending. Press the up arrow to cook.                                |

## Where the creativity went

Each move below changed what the game is without touching the rule that keeps it testable.

- **The shack is a local override.** `SHACK_MAP` in `core/content.ts` is a drawing, and `terrainAt` consults it before the noise. The world is still a pure function of seed and coordinates.
- **Rules read tables.** Items, nodes, fixtures, and recipes are rows in `core/content.ts`. A slice has few rows; a larger game has more.
- **One stream, many readers.** The camp log, the raw JSON (press F), the tasting menu, the blooper reel, the sounds, and the grid all read the same `GameEvent`s and know nothing of each other. See `game/footage.ts`.
- **Determinism gives you a demo.** A replay is a seed and commands. `?skip=plate` is not a cheat state: it runs the recorded commands through `apply`.
- **Advice is derived.** `core/advice.ts` works backward from the dish through the tables. The compass shows the answer, and the bot in `core/bot.ts` follows it, so a winning bot proves the compass tells the truth.
- **The page is a page.** Helmet-cam frame, ticket, log, and panels are HTML and CSS. Phaser still only draws the grid.
- **Types ask the questions.** A new item fails to type-check until it has an icon (`ICONS`), a new event until it has a sound (`SOUND_FOR`) and a presentation (`GridView.show`).

## Tests

`deno task test` runs without a browser: moves, walls, foraging, repair, and cooking; the shack being identical in every world; a fixpoint over the content tables that grows everything obtainable until nothing changes; the bot finishing on many seeds; the recorded run still winning; and determinism. [TESTING.md](TESTING.md) is the manual script.

After changing content, run `deno task record-run` to record a fresh winning run.

## Credits

Adapted from the CMPM 121 Fall 2026 D3 starter. All art and sound is hand-authored as SVG, CSS, and Web Audio, with Anthropic Claude agent assistance directed by the instructor. Dependencies retain their respective licenses.
