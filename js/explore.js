export function bindExploreButton(button, focusTarget, onReveal) {
  const categories = document.getElementById(button.getAttribute("aria-controls"));
  const focusCard = focusTarget.closest("li");

  button.addEventListener("click", async () => {
    if (categories.hidden) {
      categories.hidden = false;
      button.setAttribute("aria-expanded", "true");
      onReveal?.();
    }

    const activeElement = document.activeElement;
    // 等待说明牌入场，避免把焦点移到动画延迟期间隐藏的内容上。
    await Promise.allSettled(focusCard.getAnimations().map(animation => animation.finished));
    if (document.activeElement === activeElement) focusTarget.focus();
  });
}
