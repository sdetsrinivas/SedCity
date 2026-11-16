/**
 * Geometry for the ward map. The city is drawn as 6 zones (2 across, 3 down), each split into 8 wards
 * (4 across, 2 down). Shared corners are nudged by a fixed pseudo-random offset so the wards look like
 * a hand-drawn civic map while still tiling without gaps. Pure: no DOM, no randomness.
 */
export const COLS = 8;
export const ROWS = 6;
export const CELL = 56;
export const PAD = 12;
export const WIDTH = COLS * CELL + PAD * 2;
export const HEIGHT = ROWS * CELL + PAD * 2;

const ZONE_COLS = 2;
const WARDS_ACROSS = 4;
const WARDS_DOWN = 2;

type Pt = [number, number];

/** Offset of grid corner (i, j): ±9px, zero on the outer border so the city outline stays straight. */
function corner(i: number, j: number): Pt {
  const jx = i === 0 || i === COLS ? 0 : ((i * 37 + j * 91) % 19) - 9;
  const jy = j === 0 || j === ROWS ? 0 : ((i * 53 + j * 29) % 19) - 9;
  return [PAD + i * CELL + jx, PAD + j * CELL + jy];
}

const toPath = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x} ${y}`).join(" L")} Z`;

export interface WardInput { id: string; zoneId: string; no: number }
export interface WardShape { id: string; no: number; zoneId: string; d: string; cx: number; cy: number }
export interface ZoneShape { id: string; d: string }

/** Grid cell (column, row) of the n-th ward (0-based) of the k-th zone (0-based). */
export function cellOf(zoneIndex: number, wardIndex: number): { col: number; row: number } {
  const zc = zoneIndex % ZONE_COLS;
  const zr = Math.floor(zoneIndex / ZONE_COLS);
  return { col: zc * WARDS_ACROSS + (wardIndex % WARDS_ACROSS), row: zr * WARDS_DOWN + Math.floor(wardIndex / WARDS_ACROSS) };
}

export function wardShapes(wards: WardInput[], zoneIds: string[]): WardShape[] {
  return zoneIds.flatMap((zoneId, zi) =>
    wards.filter((w) => w.zoneId === zoneId).map((w, wi) => {
      const { col, row } = cellOf(zi, wi);
      const pts = [corner(col, row), corner(col + 1, row), corner(col + 1, row + 1), corner(col, row + 1)];
      const cx = Math.round(pts.reduce((a, p) => a + p[0], 0) / 4);
      const cy = Math.round(pts.reduce((a, p) => a + p[1], 0) / 4);
      return { id: w.id, no: w.no, zoneId, d: toPath(pts), cx, cy };
    }),
  );
}

/** Outline of each zone block, following the same nudged corners as its wards. */
export function zoneShapes(zoneIds: string[]): ZoneShape[] {
  return zoneIds.map((id, zi) => {
    const { col: c0, row: r0 } = cellOf(zi, 0);
    const c1 = c0 + WARDS_ACROSS;
    const r1 = r0 + WARDS_DOWN;
    const pts: Pt[] = [];
    for (let i = c0; i <= c1; i++) pts.push(corner(i, r0));
    for (let j = r0 + 1; j <= r1; j++) pts.push(corner(c1, j));
    for (let i = c1 - 1; i >= c0; i--) pts.push(corner(i, r1));
    for (let j = r1 - 1; j > r0; j--) pts.push(corner(c0, j));
    return { id, d: toPath(pts) };
  });
}
