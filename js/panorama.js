export const maxPanoramaAngle = 10;

const radiansPerDegree = Math.PI / 180;
const viewField = 96;
const sourceField = 130 * radiansPerDegree;
const orbitDuration = 60000;
const orbitResumeDelay = 1000;
const dragDegreesPerSceneWidth = 100;

function createPanorama(canvas, image, artifacts) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;

  const hotspots = Array.from(artifacts, (element) => {
    const style = getComputedStyle(element);
    return {
      element,
      x: parseFloat(style.getPropertyValue("--hotspot-x")) / 100,
      y: parseFloat(style.getPropertyValue("--hotspot-y")) / 100,
    };
  });
  let strips = [];
  let projectedZoom = 0;
  let lastAngle;
  let halfWidth;
  let halfHeight;
  let sourceHeight;

  function resize(width, height) {
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    projectedZoom = 0;
  }

  function buildProjection(zoom) {
    const width = canvas.width;
    halfWidth = Math.tan(viewField * radiansPerDegree / 2) / zoom;
    halfHeight = halfWidth * canvas.height / width;
    sourceHeight = sourceField * image.naturalHeight / image.naturalWidth;

    // A cylindrical image is sampled by azimuth; each vertical strip has a different scale.
    const count = Math.min(width, 480);
    strips = Array.from({ length: count }, (_, index) => {
      const start = Math.round(index * width / count);
      const end = Math.round((index + 1) * width / count);
      const leftRay = (2 * start / width - 1) * halfWidth;
      const rightRay = (2 * end / width - 1) * halfWidth;
      const sourceStart = (0.5 + Math.atan(leftRay) / sourceField) * image.naturalWidth;
      const sourceEnd = (0.5 + Math.atan(rightRay) / sourceField) * image.naturalWidth;
      const height = 2 * halfHeight / (sourceHeight * Math.hypot(1, (leftRay + rightRay) / 2));
      return { start, end, sourceStart, sourceEnd, height };
    });
    projectedZoom = zoom;
  }

  function render(angle, zoom) {
    if (!image.naturalWidth || !canvas.width || !canvas.height) return;
    if (zoom === projectedZoom && angle === lastAngle) return;
    if (zoom !== projectedZoom) buildProjection(zoom);
    lastAngle = angle;

    const yaw = angle * radiansPerDegree;
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const shift = yaw / sourceField * imageWidth;
    for (const { start, end, sourceStart, sourceEnd, height } of strips) {
      const left = Math.max(0, sourceStart + shift);
      const right = Math.min(imageWidth, sourceEnd + shift);
      const cropHeight = height * imageHeight;
      context.drawImage(image, left, (imageHeight - cropHeight) / 2, right - left, cropHeight,
        start, 0, end - start, canvas.height);
    }

    for (const { element, x, y } of hotspots) {
      const relativeAngle = (x - 0.5) * sourceField - yaw;
      const ray = Math.tan(relativeAngle);
      const screenX = 0.5 + ray / (2 * halfWidth);
      const screenY = 0.5 + (y - 0.5) * sourceHeight * Math.hypot(1, ray) / (2 * halfHeight);
      element.style.setProperty("--panorama-x", `${screenX * 100}cqw`);
      element.style.setProperty("--panorama-y", `${screenY * 100}%`);
      element.classList.toggle("is-offscreen", screenX < 0 || screenX > 1 || screenY < 0 || screenY > 1);
    }
    canvas.hidden = false;
  }

  return { resize, render };
}

export function createScenePanorama(canvas, image, {
  artifacts = [], shouldPause = () => false, resumeAtOrbitSpeed = false,
} = {}) {
  const panorama = createPanorama(canvas, image, artifacts);
  const coverSrc = image.src;
  const coverAlt = image.alt;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activation = null;
  let ready = false;
  let frameId;
  let previousFrame = null;
  let phase = 0;
  let resumeAt = 0;
  let returningToCenter = false;
  let angle = 0;
  let zoom = 1;
  let drag = null;

  function render() {
    if (ready) panorama.render(angle, zoom);
  }

  function setAngle(value) {
    angle = Math.max(-maxPanoramaAngle, Math.min(maxPanoramaAngle, value));
    render();
  }

  function setZoom(value) {
    zoom = value;
    render();
  }

  function advanceOrbit(step) {
    if (returningToCenter) {
      const centerDistance = Math.abs(angle) / maxPanoramaAngle;
      if (step < centerDistance) {
        setAngle(angle - Math.sign(angle) * step * maxPanoramaAngle);
        return;
      }

      // 匀速回到中点，在原有轨迹速度最高的位置接回往返运动。
      phase = angle > 0 ? Math.PI : 0;
      step -= centerDistance;
      returningToCenter = false;
    }

    phase = (phase + step) % (2 * Math.PI);
    setAngle(Math.sin(phase) * maxPanoramaAngle);
  }

  function animate(now) {
    if (previousFrame !== null && !reducedMotion.matches && now >= resumeAt && !drag && !shouldPause()) {
      const elapsed = Math.min(now - previousFrame, 50);
      advanceOrbit(elapsed * 2 * Math.PI / orbitDuration);
    }
    previousFrame = now;
    frameId = requestAnimationFrame(animate);
  }

  function resize({ width, height }) {
    panorama.resize(width, height);
    render();
  }

  const observer = new ResizeObserver(([entry]) => {
    if (ready) resize(entry.contentRect);
  });

  async function start() {
    if (activation) return;
    const current = {};
    activation = current;
    try {
      await image.decode();
    } catch {
      if (activation !== current) return;
      activation = null;
      if (image.src !== coverSrc) {
        image.src = coverSrc;
        image.alt = coverAlt;
      }
      return;
    }
    if (activation !== current || !panorama) return;

    ready = true;
    resize(image.getBoundingClientRect());
    observer.observe(image);
    frameId = requestAnimationFrame(animate);
  }

  function stop() {
    clearDrag();
    activation = null;
    ready = false;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    canvas.hidden = true;
    previousFrame = null;
    phase = 0;
    resumeAt = 0;
    returningToCenter = false;
    angle = 0;
    zoom = 1;
  }

  function deferOrbit() {
    resumeAt = performance.now() + orbitResumeDelay;
  }

  function clearDrag() {
    if (!drag) return;
    const { pointerId } = drag;
    drag = null;
    image.classList.remove("is-dragging");
    if (image.hasPointerCapture(pointerId)) image.releasePointerCapture(pointerId);
  }

  function moveDrag(event) {
    if (event.pointerId !== drag?.pointerId) return;
    const distance = (event.clientX - drag.originX) / image.clientWidth;
    drag.moved ||= distance !== 0;
    setAngle(drag.originAngle - distance * dragDegreesPerSceneWidth);
  }

  image.addEventListener("pointerdown", (event) => {
    if (!ready || drag || !event.isPrimary || event.button !== 0) return;

    drag = { pointerId: event.pointerId, originX: event.clientX, originAngle: angle, moved: false };
    image.setPointerCapture(event.pointerId);
    image.classList.add("is-dragging");
  });

  image.addEventListener("pointermove", moveDrag);
  image.addEventListener("pointerup", moveDrag);
  image.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId !== drag?.pointerId) return;

    const resumeImmediately = resumeAtOrbitSpeed && drag.moved;
    clearDrag();
    const phaseAtAngle = Math.asin(angle / maxPanoramaAngle);
    phase = Math.cos(phase) < 0 ? Math.PI - phaseAtAngle : phaseAtAngle;
    if (resumeImmediately) {
      returningToCenter = angle !== 0;
      resumeAt = 0;
    } else {
      deferOrbit();
    }
  });

  return {
    get zoom() { return zoom; },
    start, stop, setZoom, deferOrbit,
  };
}
