import { createScenePanorama } from "./panorama.js?v=exhibit-panorama-2";

const exhibit = document.querySelector(".procession");
const enterButton = document.querySelector("#enter-procession");
const sceneImage = exhibit.querySelector(".catalog__background");
const panorama = createScenePanorama(exhibit.querySelector(".scene__panorama"), sceneImage);
const processionTitle = document.querySelector("#procession-title");
const bridgeHand = exhibit.querySelector(".procession__bridge");
const lastDescription = exhibit.querySelector(".catalog__categories > :last-child");
const scrollTitle = document.querySelector("#scroll-title");
const helpButton = document.querySelector("#toggle-help");
const helpPanel = document.querySelector("#help-panel");
const journey = document.querySelector("#procession-journey");
const steps = journey.querySelectorAll("[data-step]");
const groups = journey.querySelectorAll("[data-group]");
const joinButton = journey.querySelector(".journey__join");
const maxSelected = 3;
const choices = {
  artifacts: [
    ["dressing-case", "妆奁"], ["chest", "红板箱"], ["bucket", "提桶"], ["food-box", "食盒"],
    ["mirror", "铜镜"], ["wardrobe", "红衣柜"], ["wedding-bed", "婚床"], ["lacquer-chair", "朱漆椅"],
  ],
  people: [
    ["standard-bearer", "执旗手"], ["musician", "吹奏手"], ["lantern-bearer", "掌灯手"], ["groom", "新郎"],
    ["bride", "新娘"], ["dowry-attendant", "送妆娘"], ["sedan-bearer", "抬轿夫"], ["maid", "侍女"],
  ],
};

function showStep(name) {
  for (const step of steps) {
    step.hidden = step.dataset.step !== name;
  }
  journey.scrollTop = 0;
  if (journey.open) {
    journey.querySelector("[data-step]:not([hidden]) h2").focus({ preventScroll: true });
  }
}

function updateSelection() {
  let ready = true;
  for (const group of groups) {
    const count = group.querySelectorAll('[aria-pressed="true"]').length;
    group.querySelector(".journey__count").textContent = `已选 ${count} / ${maxSelected}`;
    ready = ready && count > 0;
  }
  joinButton.disabled = !ready;
}

for (const group of groups) {
  const options = group.querySelector(".journey__options");
  const message = group.querySelector(".journey__message");
  for (const [image, name] of choices[group.dataset.group]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "journey__option";
    button.setAttribute("aria-label", name);
    button.setAttribute("aria-pressed", "false");
    const picture = document.createElement("img");
    picture.src = `assets/images/page-3/${image}.webp`;
    picture.alt = "";
    const label = document.createElement("span");
    label.textContent = name;
    button.append(picture, label);
    options.append(button);
  }

  options.addEventListener("click", (event) => {
    const option = event.target.closest(".journey__option");
    if (!option) return;

    const selected = option.getAttribute("aria-pressed") === "true";
    if (!selected && options.querySelectorAll('[aria-pressed="true"]').length >= maxSelected) {
      message.textContent = "已选满 3 项，请先取消一项。";
      return;
    }
    message.textContent = "";
    option.setAttribute("aria-pressed", String(!selected));
    updateSelection();
  });
}

enterButton.addEventListener("click", async () => {
  sceneImage.src = "assets/images/page-3/procession-gallery.jpeg";
  sceneImage.alt = "红色长廊连着映出迎亲队伍的金色长卷，参观者在展厅前驻足。";
  exhibit.dataset.mode = "explore";
  panorama.start();
  processionTitle.focus({ preventScroll: true });

  const [gallery] = await Promise.allSettled([
    sceneImage.decode(),
    ...lastDescription.getAnimations().map(animation => animation.finished),
  ]);
  bridgeHand.hidden = gallery.status !== "fulfilled";
});

document.querySelector("#procession-explore").addEventListener("click", () => scrollTitle.focus());
helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});

bridgeHand.addEventListener("click", () => {
  for (const option of journey.querySelectorAll('[aria-pressed="true"]')) {
    option.setAttribute("aria-pressed", "false");
  }
  for (const message of journey.querySelectorAll(".journey__message")) {
    message.textContent = "";
  }
  updateSelection();
  showStep("departure");
  journey.showModal();
  journey.scrollTop = 0;
});

journey.querySelector(".journey__close").addEventListener("click", () => journey.close());
journey.addEventListener("close", () => bridgeHand.focus({ preventScroll: true }));

journey.querySelector(".journey__routes").addEventListener("click", (event) => {
  if (event.target.closest(".journey__route")) showStep("selection");
});
joinButton.addEventListener("click", () => showStep("roaming"));
journey.querySelector(".journey__start").addEventListener("click", () => journey.close());
