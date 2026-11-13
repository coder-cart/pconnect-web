/** Prefer visualViewport (soft keyboard) when available. */
export function getViewportMetrics() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, offsetTop: 0, offsetLeft: 0 };
  }
  const vv = window.visualViewport;
  if (vv) {
    return {
      width: vv.width,
      height: vv.height,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetTop: 0,
    offsetLeft: 0,
  };
}

/** Keep a fixed-position menu fully inside the (visual) viewport. */
export function clampFixedMenuPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
  padding = 8,
): { left: number; top: number } {
  const { width: vw, height: vh, offsetTop, offsetLeft } = getViewportMetrics();

  let left = x;
  let top = y;

  const minLeft = offsetLeft + padding;
  const maxLeft = offsetLeft + vw - menuWidth - padding;
  const minTop = offsetTop + padding;
  const maxTop = offsetTop + vh - menuHeight - padding;

  if (left > maxLeft) left = Math.max(minLeft, maxLeft);
  if (top > maxTop) top = Math.max(minTop, maxTop);
  if (left < minLeft) left = minLeft;
  if (top < minTop) top = minTop;

  return { left, top };
}

/** Prefer placing a panel above an anchor; flip below if it does not fit. */
export function positionPanelAboveAnchor(
  anchor: DOMRect,
  menuWidth: number,
  menuHeight: number,
  gap = 8,
  padding = 8,
): { left: number; top: number } {
  const preferredX = anchor.left;
  const aboveY = anchor.top - menuHeight - gap;
  const belowY = anchor.bottom + gap;
  const { offsetTop, height: vh } = getViewportMetrics();
  const fitsAbove = aboveY >= offsetTop + padding;
  const preferredY = fitsAbove
    ? aboveY
    : Math.min(belowY, offsetTop + vh - menuHeight - padding);

  return clampFixedMenuPosition(
    preferredX,
    preferredY,
    menuWidth,
    menuHeight,
    padding,
  );
}
