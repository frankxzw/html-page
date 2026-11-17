const exhibit = document.querySelector(".homemaking");
const enterButton = document.querySelector("#enter-homemaking");
const sceneImage = exhibit.querySelector(".catalog__background");
const exhibitTitle = document.querySelector("#homemaking-title");
const interactionCard = exhibit.querySelector(".catalog__categories > :last-child");
const opener = interactionCard.querySelector("#open-homemaking");
const hand = opener.querySelector(".catalog-card__hand");
const demo = document.querySelector("#homemaking-demo");
const exploreButton = document.querySelector("#homemaking-explore");
const groomingTitle = document.querySelector("#grooming-title");
const helpButton = document.querySelector("#toggle-help");
const helpPanel = document.querySelector("#help-panel");

async function showExhibit() {
  exhibit.dataset.mode = "explore";

  await Promise.allSettled([
    sceneImage.decode(),
    ...interactionCard.getAnimations().map(animation => animation.finished),
  ]);
  hand.hidden = false;
}

enterButton.addEventListener("click", () => {
  showExhibit();
  history.replaceState({ exhibitMode: "explore" }, "");
  exhibitTitle.focus({ preventScroll: true });
});

if (history.state?.exhibitMode === "explore" || new URLSearchParams(location.search).get("mode") === "explore") {
  showExhibit();
}

exploreButton.addEventListener("click", () => groomingTitle.focus());
helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});

opener.addEventListener("click", () => demo.showModal());
demo.addEventListener("close", () => opener.focus({ preventScroll: true }));
