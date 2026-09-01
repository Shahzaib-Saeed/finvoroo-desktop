/** Pharmacy POS design canvas — all layout is authored at this size. */
export const POS_DESIGN_WIDTH = 1280;
export const POS_DESIGN_HEIGHT = 800;

/** Uniform scale so the canvas fits any viewport (browser + desktop exe). */
export function computePosScale(viewportWidth, viewportHeight) {
  const w = Math.max(viewportWidth, 1);
  const h = Math.max(viewportHeight, 1);
  return Math.min(w / POS_DESIGN_WIDTH, h / POS_DESIGN_HEIGHT);
}

export function computePosCanvasLayout(viewportWidth, viewportHeight) {
  const scale = computePosScale(viewportWidth, viewportHeight);
  const scaledWidth = POS_DESIGN_WIDTH * scale;
  const scaledHeight = POS_DESIGN_HEIGHT * scale;
  return {
    scale,
    offsetX: Math.max(0, (viewportWidth - scaledWidth) / 2),
    offsetY: Math.max(0, (viewportHeight - scaledHeight) / 2),
  };
}
