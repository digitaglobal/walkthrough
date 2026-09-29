import trace from "@/data/ground-floor-trace.json";
type Point = [number, number];
const scale = trace.estimated_m_per_px;
const walkable = trace.zones.filter((zone) => !["garden", "rug"].includes(zone.kind));
const walls = trace.walls.map((wall) => [toWorld(wall.a as Point), toWorld(wall.b as Point)] as const);
function toWorld([x, y]: Point): Point { return [(x - 639) * scale, (y - 1280) * scale]; }
function inPolygon(x: number, y: number, polygon: number[][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function segmentDistance(x: number, z: number, a: Point, b: Point) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
export function canWalk(x: number, z: number) {
  const px = x / scale + 639, py = z / scale + 1280;
  if (!walkable.some((zone) => inPolygon(px, py, zone.points))) return false;
  return !walls.some(([a, b]) => segmentDistance(x, z, a, b) < 0.22);
}
export const WALK_START = { x: (740 - 639) * scale, z: (1470 - 1280) * scale, height: 1.75 };
