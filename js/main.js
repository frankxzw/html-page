import { createScenePanorama } from "./panorama.js?v=exhibit-panorama-2";

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
const dragDegreesPerSceneWidth = 100;
let sceneDrag = null;
let activeHotspot = null;
let atlasOpener = null;

const panorama = createScenePanorama(scene.querySelector(".scene__panorama"), sceneBackground, {
  artifacts: sceneWorld.querySelectorAll(".artifact"),
  shouldPause: () => sceneDrag || activeHotspot || sceneWorld.querySelector(".hotspot:hover, .hotspot:focus-visible"),
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

scene.addEventListener("pointerdown", (event) => {
  if (exhibit.dataset.mode !== "explore" || event.target !== sceneBackground || !event.isPrimary || event.button !== 0) return;

  sceneDrag = { pointerId: event.pointerId, originX: event.clientX, originAngle: panorama.angle };
  scene.setPointerCapture(event.pointerId);
  scene.classList.add("is-dragging");
});

scene.addEventListener("pointermove", (event) => {
  if (event.pointerId !== sceneDrag?.pointerId) return;

  const distance = (event.clientX - sceneDrag.originX) / scene.clientWidth;
  panorama.setAngle(sceneDrag.originAngle - distance * dragDegreesPerSceneWidth);
});

scene.addEventListener("lostpointercapture", (event) => {
  if (event.pointerId !== sceneDrag?.pointerId) return;

  sceneDrag = null;
  panorama.resumeFromAngle();
  scene.classList.remove("is-dragging");
});

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
  const pointerId = sceneDrag?.pointerId;
  sceneDrag = null;
  if (pointerId !== undefined && scene.hasPointerCapture(pointerId)) scene.releasePointerCapture(pointerId);
  scene.classList.remove("is-dragging");
  panorama.stop();
  exhibit.dataset.mode = "cover";
  enterButton.focus({ preventScroll: true });
});

resetButton.addEventListener("click", () => selectHotspot(null));
helpButton.addEventListener("click", () => showHelp(helpPanel.hidden));

exhibit.addEventListener("click", (event) => {
  const hotspot = event.target.closest(".hotspot");
  if (hotspot) {
    selectHotspot(hotspot === activeHotspot ? null : hotspot);
    return;
  }

  const opener = event.target.closest(".wish__open");
  if (opener) {
    atlasOpener = opener;
    atlasTitle.textContent = opener.dataset.title;
    atlasImage.alt = opener.dataset.title + "，展示器物介绍、工艺纹样和结构细节。";
    atlasImage.src = opener.dataset.image;
    atlas.showModal();
    atlasView.scrollTo(0, 0);
  }
});

exhibit.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeHotspot) {
    activeHotspot.focus({ preventScroll: true });
    selectHotspot(null);
  }
});

closeButton.addEventListener("click", () => atlas.close());
atlas.addEventListener("close", () => atlasOpener.focus({ preventScroll: true }));

if (history.state?.exhibitMode === "explore"
    && performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
  showExhibit();
}
