import { PANEL_DROP, PANEL_SHACK } from "./art.ts";

// The cold open: two comic panels, then the game. Pure page, with no core involved,
// so resolving this promise is the only thing it tells anyone.
export function playOpening(root: HTMLElement): Promise<void> {
  root.hidden = false;
  document.getElementById("panel-a")!.innerHTML = PANEL_DROP;
  document.getElementById("panel-b")!.innerHTML = PANEL_SHACK;
  root.dataset.stage = "1";
  return new Promise((done) => {
    const advance = () => {
      if (root.dataset.stage === "1") {
        root.dataset.stage = "2";
        return;
      }
      removeEventListener("keydown", onKey, true);
      root.removeEventListener("click", advance);
      root.hidden = true;
      done();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      advance();
    };
    addEventListener("keydown", onKey, true);
    root.addEventListener("click", advance);
  });
}
