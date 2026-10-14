/** Mock light states for the pagoda demo — deterministic so server and client agree. */
export type LightStatus = "available" | "booked" | "renewal";

export const FLOORS = 7;
export const LIGHTS_PER_SIDE = 3;
export const LIGHTS_PER_FLOOR = LIGHTS_PER_SIDE * 4;

export function lightStatus(floor: number, index: number): LightStatus {
  const v = (floor * 7 + index * 5 + floor * index) % 9;
  if (v < 4) return "booked";
  if (v < 6) return "renewal";
  return "available";
}

export const STATUS_COLOR: Record<LightStatus, string> = {
  available: "#5b6478",
  booked: "#f2c66d",
  renewal: "#9b8cff",
};

export const STATUS_LABEL: Record<LightStatus, string> = {
  available: "Available",
  booked: "Booked",
  renewal: "Renewal due",
};

/** Floor 0 is the ground floor. Width shrinks as the tower rises. */
export function floorWidth(floor: number) {
  return 2.3 - floor * 0.24;
}
export const FLOOR_HEIGHT = 0.42;
export const ROOF_HEIGHT = 0.2;
export const TIER = FLOOR_HEIGHT + ROOF_HEIGHT;
