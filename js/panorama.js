export const maxPanoramaAngle = 15;

const radiansPerDegree = Math.PI / 180;
const viewField = 96;
const sourceField = 130 * radiansPerDegree;

export function createPanorama(canvas, image, artifacts) {
  const context = canvas.getContext("2d", { alpha: false });
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
    if (!context || !image.naturalWidth || !canvas.width || !canvas.height) return;
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
