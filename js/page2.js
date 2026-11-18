import { createScenePanorama } from "./panorama.js?v=exhibit-panorama-2";

const exhibit = document.querySelector(".catalog");
const enterButton = document.querySelector("#enter-catalog");
const sceneImage = exhibit.querySelector(".catalog__background");
const panorama = createScenePanorama(exhibit.querySelector(".scene__panorama"), sceneImage);
const catalogTitle = document.querySelector("#catalog-title");
const opener = document.querySelector("#open-dressing-tools");
const atlas = document.querySelector("#catalog-atlas");
const cardTrack = atlas.querySelector("#catalog-cards");
const cards = Array.from(cardTrack.querySelectorAll(".catalog-atlas__card"));
const middleItem = Math.floor(cards.length / 2);
const swipeThreshold = 40;
const wheelPause = 180;
const helpButton = document.querySelector("#toggle-help");
const helpPanel = document.querySelector("#help-panel");
let activeItem = middleItem;
let dragStart = null;
let lastWheelTime = -Infinity;

function selectItem(index) {
  activeItem = (index + cards.length) % cards.length;
  for (const [cardIndex, card] of cards.entries()) {
    const offset = (cardIndex - activeItem + middleItem + cards.length) % cards.length - middleItem;
    const previousOffset = Number(card.dataset.slot ?? 0);
    // 轮到另一端的卡片从对应侧边补入，不横穿中间卡片。
    card.classList.toggle("is-wrapping", Math.abs(offset - previousOffset) > middleItem);
    card.dataset.slot = offset;
    card.style.zIndex = cards.length - Math.abs(offset);
    card.setAttribute("aria-pressed", String(offset === 0));
  }
}

function clearDrag() {
  dragStart = null;
  cardTrack.classList.remove("is-dragging");
}

function showCatalog() {
  sceneImage.src = "assets/images/page-2/catalog-gallery.jpeg";
  sceneImage.alt = "梅花与池水围绕着陈列红妆器物的长廊。";
  exhibit.dataset.mode = "explore";
  panorama.start();
}

enterButton.addEventListener("click", () => {
  showCatalog();
  history.replaceState({ exhibitMode: "explore" }, "");
  catalogTitle.focus({ preventScroll: true });
});

if (history.state?.exhibitMode === "explore") {
  showCatalog();
}

opener.addEventListener("click", () => {
  selectItem(middleItem);
  atlas.showModal();
});

atlas.addEventListener("click", (event) => {
  const card = event.target.closest(".catalog-atlas__card");
  const arrow = event.target.closest("[data-step]");
  if (card) selectItem(cards.indexOf(card));
  if (arrow) selectItem(activeItem + Number(arrow.dataset.step));
});

atlas.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  selectItem(activeItem + (event.key === "ArrowLeft" ? -1 : 1));
  if (cards.includes(event.target)) cards[activeItem].focus({ preventScroll: true });
});

cardTrack.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  dragStart = { id: event.pointerId, x: event.clientX, y: event.clientY, switched: false };
});

cardTrack.addEventListener("pointermove", (event) => {
  if (event.pointerId !== dragStart?.id || dragStart.switched) return;
  const horizontal = event.clientX - dragStart.x;
  const vertical = Math.abs(event.clientY - dragStart.y);
  if (Math.abs(horizontal) <= 10 || Math.abs(horizontal) <= vertical) return;

  if (!cardTrack.hasPointerCapture(event.pointerId)) {
    cardTrack.setPointerCapture(event.pointerId);
    cardTrack.classList.add("is-dragging");
  }
  if (Math.abs(horizontal) >= swipeThreshold) {
    dragStart.switched = true;
    selectItem(activeItem + (horizontal < 0 ? 1 : -1));
  }
});

cardTrack.addEventListener("pointerup", (event) => {
  if (event.pointerId === dragStart?.id) clearDrag();
});

cardTrack.addEventListener("pointercancel", (event) => {
  if (event.pointerId === dragStart?.id) clearDrag();
});

cardTrack.addEventListener("lostpointercapture", (event) => {
  if (event.target === cardTrack && event.pointerId === dragStart?.id) clearDrag();
});

cardTrack.addEventListener("animationend", (event) => {
  if (event.animationName === "catalog-card-reappear") event.target.classList.remove("is-wrapping");
});

cardTrack.addEventListener("wheel", (event) => {
  const horizontal = event.deltaX || (event.shiftKey ? event.deltaY : 0);
  if (!horizontal || (!event.shiftKey && Math.abs(horizontal) < Math.abs(event.deltaY))) return;

  event.preventDefault();
  const paused = event.timeStamp - lastWheelTime >= wheelPause;
  lastWheelTime = event.timeStamp;
  if (paused) selectItem(activeItem + (horizontal > 0 ? 1 : -1));
}, { passive: false });

document.querySelector("#close-catalog").addEventListener("click", () => atlas.close());
atlas.addEventListener("close", () => {
  clearDrag();
  opener.focus({ preventScroll: true });
});

document.querySelector("#catalog-explore").addEventListener("click", () => opener.focus());
helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});
