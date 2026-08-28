/**
 * Figma/Canva-style smart guides: snap + guide lines + spacing labels.
 * All units are millimeters.
 */

const DEFAULT_THRESHOLD_MM = 0.75;

function edgesOf(g) {
  return {
    left: g.x,
    right: g.x + g.w,
    centerX: g.x + g.w / 2,
    top: g.y,
    bottom: g.y + g.h,
    centerY: g.y + g.h / 2,
  };
}

/**
 * @param {{ x:number,y:number,w:number,h:number }} moving
 * @param {Array<{ id:string, x:number,y:number,w:number,h:number }>} others
 * @param {{ width_mm:number, height_mm:number, margins_mm?: object }} page
 * @param {number} [thresholdMm]
 */
export function computeSmartGuides(moving, others, page, thresholdMm = DEFAULT_THRESHOLD_MM) {
  const m = edgesOf(moving);
  const pageW = Number(page.width_mm) || 210;
  const pageH = Number(page.height_mm) || 297;
  const mt = Number(page.margins_mm?.top) || 0;
  const mr = Number(page.margins_mm?.right) || 0;
  const mb = Number(page.margins_mm?.bottom) || 0;
  const ml = Number(page.margins_mm?.left) || 0;

  const xTargets = [
    { value: 0, source: 'page' },
    { value: pageW, source: 'page' },
    { value: pageW / 2, source: 'page-center' },
    { value: ml, source: 'margin' },
    { value: pageW - mr, source: 'margin' },
  ];
  const yTargets = [
    { value: 0, source: 'page' },
    { value: pageH, source: 'page' },
    { value: pageH / 2, source: 'page-center' },
    { value: mt, source: 'margin' },
    { value: pageH - mb, source: 'margin' },
  ];

  for (const o of others) {
    const e = edgesOf(o);
    xTargets.push(
      { value: e.left, source: o.id, edge: 'left' },
      { value: e.right, source: o.id, edge: 'right' },
      { value: e.centerX, source: o.id, edge: 'centerX' },
    );
    yTargets.push(
      { value: e.top, source: o.id, edge: 'top' },
      { value: e.bottom, source: o.id, edge: 'bottom' },
      { value: e.centerY, source: o.id, edge: 'centerY' },
    );
  }

  let bestDx = null;
  let bestDy = null;
  const vGuides = []; // x = const
  const hGuides = []; // y = const

  const movingXEdges = [
    { key: 'left', value: m.left },
    { key: 'right', value: m.right },
    { key: 'centerX', value: m.centerX },
  ];
  const movingYEdges = [
    { key: 'top', value: m.top },
    { key: 'bottom', value: m.bottom },
    { key: 'centerY', value: m.centerY },
  ];

  for (const me of movingXEdges) {
    for (const t of xTargets) {
      const dx = t.value - me.value;
      if (Math.abs(dx) <= thresholdMm) {
        if (bestDx == null || Math.abs(dx) < Math.abs(bestDx.dx)) {
          bestDx = { dx, guideX: t.value, movingEdge: me.key, target: t };
        }
      }
    }
  }

  for (const me of movingYEdges) {
    for (const t of yTargets) {
      const dy = t.value - me.value;
      if (Math.abs(dy) <= thresholdMm) {
        if (bestDy == null || Math.abs(dy) < Math.abs(bestDy.dy)) {
          bestDy = { dy, guideY: t.value, movingEdge: me.key, target: t };
        }
      }
    }
  }

  let snapX = moving.x;
  let snapY = moving.y;
  if (bestDx) {
    snapX = moving.x + bestDx.dx;
    vGuides.push({ x: bestDx.guideX, kind: bestDx.target.source === 'page-center' ? 'center' : 'edge' });
  }
  if (bestDy) {
    snapY = moving.y + bestDy.dy;
    hGuides.push({ y: bestDy.guideY, kind: bestDy.target.source === 'page-center' ? 'center' : 'edge' });
  }

  const snapped = { ...moving, x: snapX, y: snapY };
  const sm = edgesOf(snapped);

  // Spacing labels: nearest neighbor gaps when roughly aligned.
  const distances = [];
  for (const o of others) {
    const e = edgesOf(o);
    const overlapX = sm.left < e.right && sm.right > e.left;
    const overlapY = sm.top < e.bottom && sm.bottom > e.top;

    if (overlapX) {
      if (sm.top >= e.bottom - thresholdMm && sm.top - e.bottom < 40) {
        const gap = Math.round((sm.top - e.bottom) * 10) / 10;
        if (gap >= 0) {
          distances.push({
            type: 'v',
            x: (Math.max(sm.left, e.left) + Math.min(sm.right, e.right)) / 2,
            y1: e.bottom,
            y2: sm.top,
            label: `${gap}`,
          });
        }
      }
      if (e.top >= sm.bottom - thresholdMm && e.top - sm.bottom < 40) {
        const gap = Math.round((e.top - sm.bottom) * 10) / 10;
        if (gap >= 0) {
          distances.push({
            type: 'v',
            x: (Math.max(sm.left, e.left) + Math.min(sm.right, e.right)) / 2,
            y1: sm.bottom,
            y2: e.top,
            label: `${gap}`,
          });
        }
      }
    }
    if (overlapY) {
      if (sm.left >= e.right - thresholdMm && sm.left - e.right < 40) {
        const gap = Math.round((sm.left - e.right) * 10) / 10;
        if (gap >= 0) {
          distances.push({
            type: 'h',
            y: (Math.max(sm.top, e.top) + Math.min(sm.bottom, e.bottom)) / 2,
            x1: e.right,
            x2: sm.left,
            label: `${gap}`,
          });
        }
      }
      if (e.left >= sm.right - thresholdMm && e.left - sm.right < 40) {
        const gap = Math.round((e.left - sm.right) * 10) / 10;
        if (gap >= 0) {
          distances.push({
            type: 'h',
            y: (Math.max(sm.top, e.top) + Math.min(sm.bottom, e.bottom)) / 2,
            x1: sm.right,
            x2: e.left,
            label: `${gap}`,
          });
        }
      }
    }
  }

  // Dedupe guides
  const uniqV = [];
  for (const g of vGuides) {
    if (!uniqV.some((u) => Math.abs(u.x - g.x) < 0.01)) uniqV.push(g);
  }
  const uniqH = [];
  for (const g of hGuides) {
    if (!uniqH.some((u) => Math.abs(u.y - g.y) < 0.01)) uniqH.push(g);
  }

  return {
    x: snapX,
    y: snapY,
    dx: bestDx?.dx ?? 0,
    dy: bestDy?.dy ?? 0,
    vGuides: uniqV,
    hGuides: uniqH,
    distances: distances.slice(0, 6),
  };
}
