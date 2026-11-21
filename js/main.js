import { createScenePanorama } from "./panorama.js?v=orbit-resume";

const exhibit = document.querySelector(".exhibit");
const scene = document.querySelector(".scene");
const sceneWorld = scene.querySelector(".scene__world");
const sceneBackground = scene.querySelector(".scene__background");
const enterButton = document.querySelector("#enter-exhibit");
const homeButton = document.querySelector("#return-home");
const resetButton = document.querySelector("#reset-exploration");
const helpButton = document.querySelector("#toggle-help");
const helpPanel = document.querySelector("#help-panel");
const atlas = document.querySelector("#atlas");
const atlasTitle = document.querySelector("#atlas-title");
const atlasImage = document.querySelector("#atlas-image");
const atlasView = document.querySelector("#atlas-view");
const closeButton = document.querySelector("#close-atlas");
const maxSceneZoom = 1.1;
const backgroundDragThreshold = 4;
let activeHotspot = null;
let backgroundPress = null;

const panorama = createScenePanorama(scene.querySelector(".scene__panorama"), sceneBackground, {
  artifacts: sceneWorld.querySelectorAll(".artifact"),
  shouldPause: () => activeHotspot || sceneWorld.querySelector(".hotspot:hover, .hotspot:focus-visible"),
  resumeAtOrbitSpeed: true,
});

function selectHotspot(nextHotspot) {
  if (activeHotspot) {
    activeHotspot.setAttribute("aria-expanded", "false");
    document.getElementById(activeHotspot.getAttribute("aria-controls")).hidden = true;
  }

  activeHotspot = nextHotspot;
  if (activeHotspot) {
    activeHotspot.setAttribute("aria-expanded", "true");
    document.getElementById(activeHotspot.getAttribute("aria-controls")).hidden = false;
  }
}

function showHelp(visible) {
  helpPanel.hidden = !visible;
  helpButton.setAttribute("aria-expanded", String(visible));
}

scene.addEventListener("wheel", (event) => {
  if (exhibit.dataset.mode !== "explore" || event.target !== sceneBackground || event.ctrlKey || event.metaKey || event.deltaY === 0) return;

  const unitSize = [1, 16, 100][event.deltaMode] ?? 1;
  const zoom = Math.max(1, Math.min(maxSceneZoom, panorama.zoom - event.deltaY * unitSize / 2000));
  if (zoom === panorama.zoom) return;

  panorama.setZoom(zoom);
  event.preventDefault();
  panorama.deferOrbit();
}, { passive: false });

function showExhibit() {
  exhibit.dataset.mode = "explore";
  panorama.start();
}

enterButton.addEventListener("click", () => {
  history.replaceState({ exhibitMode: "explore" }, "");
  showExhibit();
  showHelp(true);
  scene.querySelector(".artifact:not(.is-offscreen) .hotspot")?.focus({ preventScroll: true });
});

homeButton.addEventListener("click", () => {
  history.replaceState(null, "");
  selectHotspot(null);
  panorama.stop();
  exhibit.dataset.mode = "cover";
  enterButton.focus({ preventScroll: true });
});

resetButton.addEventListener("click", () => selectHotspot(null));
helpButton.addEventListener("click", () => showHelp(helpPanel.hidden));

sceneBackground.addEventListener("pointerdown", (event) => {
  if (event.isPrimary && event.button === 0) {
    backgroundPress = { pointerId: event.pointerId, x: event.clientX, dragged: false };
  }
});

sceneBackground.addEventListener("pointermove", (event) => {
  if (event.pointerId === backgroundPress?.pointerId && event.buttons === 1
      && Math.abs(event.clientX - backgroundPress.x) > backgroundDragThreshold) {
    backgroundPress.dragged = true;
  }
});

document.addEventListener("click", (event) => {
  const target = event.target;
  const followedDrag = target === sceneBackground && event.detail > 0 && backgroundPress?.dragged;
  if (atlas.contains(target) || followedDrag) return;

  const hotspot = target.closest(".hotspot");
  if (hotspot) {
    selectHotspot(hotspot === activeHotspot ? null : hotspot);
    return;
  }

  const opener = target.closest(".wish__open");
  if (opener) {
    atlasTitle.textContent = opener.dataset.title;
    atlasImage.alt = opener.dataset.title + "，展示器物介绍、工艺纹样和结构细节。";
    atlasImage.src = opener.dataset.image;
    atlas.showModal();
    atlasView.scrollTo(0, 0);
    return;
  }

  if (activeHotspot && !target.closest(".wish")) selectHotspot(null);
});

exhibit.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeHotspot) {
    activeHotspot.focus({ preventScroll: true });
    selectHotspot(null);
  }
});

closeButton.addEventListener("click", () => atlas.close());
atlas.addEventListener("close", () => {
  const hotspot = activeHotspot;
  selectHotspot(null);
  hotspot?.focus({ preventScroll: true });
});

if (history.state?.exhibitMode === "explore"
    && performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
  showExhibit();
}
