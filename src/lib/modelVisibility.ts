// Temporary test switch. Set false to restore hinged room/service door leaves.
export const HIDE_ROOM_DOORS = true;
const roomDoors = new Set([
  'Powder room door open leaf', 'Service room door open leaf', 'Service yard door open leaf',
  'Bedroom one door', 'Bedroom two door', 'Bedroom three door', 'Ensuite door',
  'Family bath door', 'Upper bath door',
]);
export function isRoomDoor(name: string): boolean {
  const normalized = name.replaceAll('_', ' ');
  return roomDoors.has(normalized) || [...roomDoors].some(leaf =>
    normalized.startsWith(`${leaf} handle`) || normalized.startsWith(`${leaf} hinge`));
}
