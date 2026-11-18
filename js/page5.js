import { createScenePanorama } from "./panorama.js?v=exhibit-panorama-2";

const exhibit = document.querySelector(".wishes");
const enterButton = document.querySelector("#enter-wishes");
const sceneImage = exhibit.querySelector(".catalog__background");
const panorama = createScenePanorama(exhibit.querySelector(".scene__panorama"), sceneImage);
const exhibitTitle = document.querySelector("#wishes-title");
const interactionCard = exhibit.querySelector(".catalog__categories > :last-child");
const opener = interactionCard.querySelector("#open-wishes");
const hand = opener.querySelector(".catalog-card__hand");
const exploreButton = document.querySelector("#wishes-explore");
const lightsTitle = document.querySelector("#lights-title");
const helpButton = document.querySelector("#toggle-help");
const helpPanel = document.querySelector("#help-panel");

const dialog = document.querySelector("#wish-dialog");
const wishForm = dialog.querySelector("form");
const workflow = dialog.querySelector(".wish-workflow");
const steps = [...dialog.querySelectorAll("[data-wish-step]")];
const progress = [...workflow.querySelectorAll(".wish-progress li")];
const wishOptions = dialog.querySelector(".wish-options");
const defaultWish = wishOptions.querySelector("input[value='温暖']");
const selectedWishes = new Set();
const preview = dialog.querySelector(".wish-preview");
const previewImage = preview.querySelector("img");
const previewTitle = preview.querySelector("h3");
const previewDescription = preview.querySelector("p");
const wishDescriptions = {
  温暖: previewDescription.textContent,
  陪伴: "希望拥有一个可以常伴彼此的家，一起吃饭、散步、聊聊一天的见闻，把平常的日子过成共同的回忆。",
  自然: "希望把四季带进家里，让窗边有绿意，屋里有清风，每天都能看见阳光和草木的变化。",
  自由: "希望家里有一处可以随心安排的角落，读书、做手工，或安静地坐一会儿，按自己的节奏生活。",
  安居: "希望有一个安稳的住所，日常器物各有其位，忙了一天回到家，就能安心歇下来。",
  团圆: "希望家里总有一张能围坐的桌子，过节时亲人从各地回来，一起吃顿饭，慢慢说说近况。",
};
const artifactOptions = dialog.querySelector(".wish-artifacts");
const artifactList = dialog.querySelector(".wish-basket__list");
const artifactItem = document.querySelector("#wish-basket-item");
const homeOptions = dialog.querySelector("#wish-home-options");
const homePreviewImage = dialog.querySelector(".wish-home-preview__image");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let homePreviewAnimation;

async function showExhibit() {
  sceneImage.src = "assets/images/page-5/wishes-gallery.webp";
  sceneImage.alt = "灯笼和烛光映照着夜色中的展厅，远处亮起山间灯火。";
  exhibit.dataset.mode = "explore";
  panorama.start();

  await Promise.allSettled([
    sceneImage.decode(),
    ...interactionCard.getAnimations().map(animation => animation.finished),
  ]);
  hand.hidden = false;
}

function showWish(option) {
  previewImage.src = option.closest("label").querySelector("img").src;
  previewTitle.textContent = option.value;
  previewDescription.textContent = wishDescriptions[option.value];
}

function clearWishes() {
  for (const option of selectedWishes) {
    option.checked = false;
  }
  selectedWishes.clear();
  showWish(defaultWish);
}

function showStep(index) {
  workflow.hidden = index === steps.length - 1;
  steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
  progress.forEach((item, stepIndex) => {
    if (stepIndex === index) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
  if (dialog.open) {
    dialog.scrollTop = 0;
    steps[index].querySelector("h2").focus({ preventScroll: true });
  }
}

enterButton.addEventListener("click", () => {
  showExhibit();
  history.replaceState({ exhibitMode: "explore" }, "");
  exhibitTitle.focus({ preventScroll: true });
});

if (history.state?.exhibitMode === "explore") {
  showExhibit();
}

exploreButton.addEventListener("click", () => lightsTitle.focus());
helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});

opener.addEventListener("click", () => {
  wishForm.reset();
  clearWishes();
  artifactList.replaceChildren();
  homePreviewAnimation?.cancel();
  homePreviewImage.classList.remove("is-visible");
  showStep(0);
  dialog.showModal();
  dialog.scrollTop = 0;
});

wishOptions.addEventListener("change", ({ target: option }) => {
  if (option.checked) {
    selectedWishes.add(option);
  } else {
    selectedWishes.delete(option);
  }
  showWish([...selectedWishes].at(-1) ?? defaultWish);
});

dialog.querySelector("#reset-wishes").addEventListener("click", clearWishes);

artifactOptions.addEventListener("change", ({ target: option }) => {
  if (!option.checked) {
    artifactList.querySelector(`[data-artifact="${option.value}"]`).remove();
    return;
  }

  const row = artifactItem.content.firstElementChild.cloneNode(true);
  row.dataset.artifact = option.value;
  row.querySelector("img").src = option.closest("label").querySelector("img").src;
  row.querySelector("span").textContent = option.value;
  row.querySelector("button").setAttribute("aria-label", `移除${option.value}`);
  artifactList.append(row);
});

artifactList.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  const row = button.closest("li");
  const adjacentRow = row.nextElementSibling ?? row.previousElementSibling;
  const option = artifactOptions.querySelector(`input[value="${row.dataset.artifact}"]`);
  option.checked = false;
  row.remove();
  (adjacentRow?.querySelector("button") ?? option).focus();
});

homeOptions.addEventListener("change", () => {
  homePreviewAnimation?.cancel();
  homePreviewImage.classList.add("is-visible");
  if (reducedMotion.matches) return;

  homePreviewAnimation = homePreviewImage.animate([
    { opacity: 0, transform: "scale(.65)" },
    { opacity: 1, transform: "scale(1)" },
  ], { duration: 500, easing: "ease-out" });
});

for (const button of dialog.querySelectorAll("[data-next]")) {
  button.addEventListener("click", () => showStep(Number(button.dataset.next)));
}

dialog.addEventListener("close", () => opener.focus({ preventScroll: true }));
