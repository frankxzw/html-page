import { createPanorama, maxPanoramaAngle } from "./panorama.js";

const exhibit = document.querySelector(".exhibit");
const scene = document.querySelector(".scene");
const sceneWorld = scene.querySelector(".scene__world");
const sceneBackground = scene.querySelector(".scene__background");
const panorama = createPanorama(
  scene.querySelector(".scene__panorama"), sceneBackground, scene.querySelectorAll(".artifact"),
);
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
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const maxSceneZoom = 1.1;
const dragDegreesPerSceneWidth = 100;
const orbitDuration = 50000;
const orbitResumeDelay = 1000;
let sceneAngle = 0;
let sceneZoom = 1;
let sceneDrag = null;
let orbitPhase = 0;
let previousOrbitFrame = null;
let resumeOrbitAt = 0;
let activeHotspot = null;
let atlasOpener = null;

function setSceneAngle(angle) {
  sceneAngle = Math.max(-maxPanoramaAngle, Math.min(maxPanoramaAngle, angle));
  panorama.render(sceneAngle, sceneZoom);
}

function setSceneZoom(zoom) {
  sceneZoom = Math.max(1, Math.min(maxSceneZoom, zoom));
  panorama.render(sceneAngle, sceneZoom);
}

function animateOrbit(now) {
  if (previousOrbitFrame !== null && !reducedMotion.matches && now >= resumeOrbitAt
      && !sceneDrag && !activeHotspot && !sceneWorld.querySelector(".hotspot:hover, .hotspot:focus-visible")) {
    const elapsed = Math.min(now - previousOrbitFrame, 50);
    orbitPhase = (orbitPhase + elapsed * 2 * Math.PI / orbitDuration) % (2 * Math.PI);
    setSceneAngle(Math.sin(orbitPhase) * maxPanoramaAngle);
  }
  previousOrbitFrame = now;
  requestAnimationFrame(animateOrbit);
}

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
  if (event.target !== sceneBackground || !event.isPrimary || event.button !== 0) return;

  sceneDrag = { pointerId: event.pointerId, originX: event.clientX, originAngle: sceneAngle };
  scene.setPointerCapture(event.pointerId);
  scene.classList.add("is-dragging");
});

scene.addEventListener("pointermove", (event) => {
  if (event.pointerId !== sceneDrag?.pointerId) return;

  const distance = (event.clientX - sceneDrag.originX) / scene.clientWidth;
  setSceneAngle(sceneDrag.originAngle - distance * dragDegreesPerSceneWidth);
});

scene.addEventListener("lostpointercapture", (event) => {
  if (event.pointerId !== sceneDrag?.pointerId) return;

  sceneDrag = null;
  const phaseAtAngle = Math.asin(sceneAngle / maxPanoramaAngle);
  orbitPhase = Math.cos(orbitPhase) < 0 ? Math.PI - phaseAtAngle : phaseAtAngle;
  resumeOrbitAt = performance.now() + orbitResumeDelay;
  scene.classList.remove("is-dragging");
});

scene.addEventListener("wheel", (event) => {
  if (event.target !== sceneBackground || event.ctrlKey || event.metaKey || event.deltaY === 0) return;

  const unitSize = [1, 16, 100][event.deltaMode] ?? 1;
  const previousZoom = sceneZoom;
  setSceneZoom(sceneZoom - event.deltaY * unitSize / 2000);
  if (sceneZoom === previousZoom) return;

  event.preventDefault();
  resumeOrbitAt = performance.now() + orbitResumeDelay;
}, { passive: false });

enterButton.addEventListener("click", () => {
  history.replaceState({ exhibitMode: "explore" }, "");
  exhibit.dataset.mode = "explore";
  showHelp(true);
  scene.querySelector(".artifact:not(.is-offscreen) .hotspot")?.focus({ preventScroll: true });
});

homeButton.addEventListener("click", () => {
  history.replaceState(null, "");
  selectHotspot(null);
  orbitPhase = 0;
  resumeOrbitAt = performance.now() + orbitResumeDelay;
  setSceneAngle(0);
  setSceneZoom(1);
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

sceneBackground.addEventListener("load", () => panorama.render(sceneAngle, sceneZoom));
new ResizeObserver(([entry]) => {
  panorama.resize(entry.contentRect.width, entry.contentRect.height);
  panorama.render(sceneAngle, sceneZoom);
}).observe(sceneWorld);

if (history.state?.exhibitMode === "explore"
    && performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
  exhibit.dataset.mode = "explore";
}

requestAnimationFrame(animateOrbit);
