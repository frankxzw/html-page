const exhibit = document.querySelector(".catalog");
const enterButton = document.querySelector("#enter-catalog");
const sceneImage = exhibit.querySelector(".catalog__background");
const catalogTitle = document.querySelector("#catalog-title");
const opener = document.querySelector("#open-dressing-tools");
const atlas = document.querySelector("#catalog-atlas");
const atlasView = document.querySelector("#catalog-view");
const atlasImage = document.querySelector("#catalog-image");
const itemButtons = atlas.querySelectorAll(".catalog-atlas__item");
const helpButton = document.querySelector("#toggle-help");
const helpPanel = document.querySelector("#help-panel");

function selectItem(selectedItem) {
  for (const item of itemButtons) {
    item.setAttribute("aria-pressed", String(item === selectedItem));
  }
  atlasImage.src = selectedItem.dataset.image;
  atlasImage.alt = selectedItem.dataset.description;
  atlasView.scrollTo(0, 0);
}

function showCatalog() {
  sceneImage.src = "assets/images/page-2/catalog-gallery.jpeg";
  sceneImage.alt = "梅花与池水围绕着陈列红妆器物的长廊。";
  exhibit.dataset.mode = "explore";
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
  atlas.showModal();
  selectItem(itemButtons[0]);
});

for (const item of itemButtons) {
  item.addEventListener("click", () => selectItem(item));
}

document.querySelector("#close-catalog").addEventListener("click", () => atlas.close());
atlas.addEventListener("close", () => opener.focus({ preventScroll: true }));

document.querySelector("#catalog-explore").addEventListener("click", () => opener.focus());
helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});
