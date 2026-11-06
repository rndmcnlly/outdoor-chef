# Manual test script

For a person, or an agent driving a browser. Run `deno task preview`. Before each section, reload. To read logical state, use `game.state` in the console.

**Promotion rule:** a bug found by hand or by an agent becomes a permanent test in `core/` before it is fixed, unless it truly lives in `game/`, in which case add a step here.

| #  | Action                                        | Expected observation                                                                                     |
| -- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1  | Load the page                                 | The first comic panel. No console errors.                                                                |
| 2  | Press Enter twice                             | The second panel appears, then the shack: pale floor, dark log walls, a collapsed hearth.                |
| 3  | Press up twice                                | The chef stops at the hearth and bumps. The log and subtitle say it has collapsed.                       |
| 4  | Walk out the south door and over three sticks | The ticket counts to 3/3, in step with each pickup, never ahead of the chef.                             |
| 5  | Walk back and into the hearth                 | Flames, smoke, and a shake. The ticket changes to RAT-ON-A-STICK.                                        |
| 6  | Press F                                       | The log becomes green JSON that includes earlier events. Press F again to return.                        |
| 7  | Follow the compass to the end                 | The rat, a stick, two thyme, then the hearth. The plate and review appear.                               |
| 8  | Load `?replay&speed=3`, then press `+`        | It plays by itself, and the badge shows the new speed.                                                   |
| 9  | Load `?skip=plate`, then press up             | The ending appears, with the same menu a full run shows.                                                 |
| 10 | Load `?seed=7`                                | The same shack in a different forest.                                                                    |
| 11 | Listen (headphones or speakers)               | Steps, a pluck on pickups, three notes on repair, a sizzle, a fanfare. **Only a person can check this.** |
