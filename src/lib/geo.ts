export type Point = { latitude: number | null; longitude: number | null };

const EARTH_RADIUS_KM = 6371;

/** Straight-line distance in km, or null when either side has no coordinates. */
export function distanceKm(a: Point, b: Point): number | null {
  if (
    a.latitude == null ||
    a.longitude == null ||
    b.latitude == null ||
    b.longitude == null
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 10) * 100} m away`;
  return `${km.toFixed(1)} km away`;
}

export const RADIUS_OPTIONS = [2, 5, 10, 25, 50] as const;
