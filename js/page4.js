import { createScenePanorama } from "./panorama.js?v=exhibit-drag";
import { bindExploreButton } from "./explore.js";

const exhibit = document.querySelector(".homemaking");
const enterButton = document.querySelector("#enter-homemaking");
const sceneImage = exhibit.querySelector(".catalog__background");
const panorama = createScenePanorama(exhibit.querySelector(".scene__panorama"), sceneImage);
const exhibitTitle = document.querySelector("#homemaking-title");
const interactionCard = exhibit.querySelector(".catalog__categories > :last-child");
const opener = interactionCard.querySelector("#open-homemaking");
const hand = opener.querySelector(".catalog-card__hand");
const demo = document.querySelector("#homemaking-demo");
const exploreButton = document.querySelector("#homemaking-explore");
const groomingTitle = document.querySelector("#grooming-title");
const helpButton = document.querySelector("#toggle-help");
const helpPanel = document.querySelector("#help-panel");
const placement = demo.querySelector(".placement");
const stage = placement.querySelector(".placement__stage");
const categories = placement.querySelector(".placement__categories");
const paletteContents = placement.querySelectorAll(".placement__content > *");
const placementStatus = document.querySelector("#placement-status");
const furniture = {
  bed: { name: "婚床", width: .3 },
  bench: { name: "春凳", width: .24 },
  cabinet: { name: "床边小柜", width: .15 },
};
const placedItems = new Map();
let drag = null;
let suppressClick = false;

function positionItem(button, x, y) {
  const bounds = stage.getBoundingClientRect();
  const halfWidth = button.offsetWidth / bounds.width / 2;
  const halfHeight = button.offsetHeight / bounds.height / 2;
  const item = placedItems.get(button);
  item.x = Math.max(halfWidth, Math.min(1 - halfWidth, x));
  item.y = Math.max(halfHeight, Math.min(1 - halfHeight, y));
  button.style.left = `${item.x * 100}%`;
  button.style.top = `${item.y * 100}%`;
}

function createItem(type, x = .5, y = .5) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "placement__placed";
  button.dataset.furniture = type;
  button.style.setProperty("--furniture-width", `${furniture[type].width * 100}%`);
  button.setAttribute("aria-label", `${furniture[type].name}，方向键移动，Delete 删除`);
  button.append(placement.querySelector(`[data-furniture="${type}"] img`).cloneNode());
  stage.append(button);
  placedItems.set(button, { type, x, y });
  positionItem(button, x, y);
  button.focus({ preventScroll: true });
  placementStatus.textContent = `已放置${furniture[type].name}，可继续拖动调整。`;
}

function clearDrag() {
  if (!drag) return;
  const current = drag;
  drag = null;
  current.preview?.remove();
  current.source.classList.remove("is-drag-source");
  stage.classList.remove("is-drop-target");
  if (current.source.hasPointerCapture(current.pointerId)) {
    current.source.releasePointerCapture(current.pointerId);
  }
}

function isInsideStage(event) {
  const bounds = stage.getBoundingClientRect();
  return event.clientX >= bounds.left && event.clientX <= bounds.right
    && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
}

function hasMoved(event, current) {
  return Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >= 5;
}

categories.addEventListener("change", () => {
  for (const element of paletteContents) element.hidden = false;
});

placement.addEventListener("pointerdown", event => {
  const source = event.target.closest(".placement__furniture, .placement__placed");
  if (!source || event.button !== 0 || !event.isPrimary || drag) return;
  event.preventDefault();
  suppressClick = false;
  source.focus({ preventScroll: true });
  const bounds = source.getBoundingClientRect();
  const existing = placedItems.has(source);
  drag = {
    source,
    type: source.dataset.furniture,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: existing ? event.clientX - bounds.left - bounds.width / 2 : 0,
    offsetY: existing ? event.clientY - bounds.top - bounds.height / 2 : 0,
    preview: null,
  };
  source.setPointerCapture(event.pointerId);
});

placement.addEventListener("pointermove", event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.preview && !hasMoved(event, drag)) return;
  if (!drag.preview) {
    drag.preview = drag.source.querySelector("img").cloneNode();
    drag.preview.className = "placement__drag";
    drag.preview.style.width = `${stage.getBoundingClientRect().width * furniture[drag.type].width}px`;
    drag.preview.setAttribute("aria-hidden", "true");
    placement.append(drag.preview);
    drag.source.classList.add("is-drag-source");
  }
  const bounds = placement.getBoundingClientRect();
  drag.preview.style.left = `${event.clientX - bounds.left - drag.offsetX}px`;
  drag.preview.style.top = `${event.clientY - bounds.top - drag.offsetY}px`;
  stage.classList.toggle("is-drop-target", isInsideStage(event));
});

placement.addEventListener("pointerup", event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const current = drag;
  const moved = Boolean(current.preview) || hasMoved(event, current);
  const inside = isInsideStage(event);
  clearDrag();
  if (!moved) return;
  suppressClick = true;
  if (!inside) {
    placementStatus.textContent = "请将物品拖入左侧框内。";
    return;
  }
  const bounds = stage.getBoundingClientRect();
  const x = (event.clientX - current.offsetX - bounds.left) / bounds.width;
  const y = (event.clientY - current.offsetY - bounds.top) / bounds.height;
  if (placedItems.has(current.source)) {
    stage.append(current.source);
    positionItem(current.source, x, y);
    current.source.focus({ preventScroll: true });
  } else {
    createItem(current.type, x, y);
  }
});

placement.addEventListener("pointercancel", event => {
  if (drag?.pointerId === event.pointerId) clearDrag();
});
placement.addEventListener("lostpointercapture", event => {
  if (drag?.pointerId === event.pointerId) clearDrag();
});

placement.addEventListener("click", event => {
  if (suppressClick && event.detail > 0) {
    suppressClick = false;
    return;
  }
  const button = event.target.closest(".placement__furniture");
  if (button) createItem(button.dataset.furniture);
});

stage.addEventListener("keydown", event => {
  const item = placedItems.get(event.target);
  if (!item) return;
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    placedItems.delete(event.target);
    event.target.remove();
    stage.focus({ preventScroll: true });
    placementStatus.textContent = `已移除${furniture[item.type].name}。`;
    return;
  }
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const step = event.shiftKey ? .1 : .02;
  positionItem(event.target, item.x + direction[0] * step, item.y + direction[1] * step);
});

function showExhibit() {
  exhibit.dataset.mode = "explore";
  panorama.start();
}

enterButton.addEventListener("click", () => {
  showExhibit();
  history.replaceState({ exhibitMode: "explore" }, "");
  exhibitTitle.focus({ preventScroll: true });
});

if (history.state?.exhibitMode === "explore" || new URLSearchParams(location.search).get("mode") === "explore") {
  showExhibit();
}

bindExploreButton(exploreButton, groomingTitle, async () => {
  await Promise.allSettled([
    sceneImage.decode(),
    ...interactionCard.getAnimations().map(animation => animation.finished),
  ]);
  hand.hidden = false;
});
helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});

opener.addEventListener("click", () => {
  clearDrag();
  for (const category of categories.querySelectorAll("input")) category.checked = false;
  for (const element of paletteContents) element.hidden = true;
  placedItems.clear();
  stage.replaceChildren();
  placementStatus.textContent = "";
  suppressClick = false;
  demo.showModal();
  demo.scrollTop = 0;
});
demo.addEventListener("close", () => {
  clearDrag();
  opener.focus({ preventScroll: true });
});
