const NOMINATIM_HEADERS = {
  'User-Agent': 'PMS-ClinicApp/1.0',
  'Accept-Language': 'en',
};

/**
 * Forward geocode: province + city → [lat, lng]
 * Restricted to Philippines (countrycodes=ph).
 * Returns null on failure — callers should handle silently.
 */
export async function forwardGeocode(
  city: string,
  province: string,
): Promise<[number, number] | null> {
  const q = encodeURIComponent(`${city}, ${province}, Philippines`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ph`,
      { headers: NOMINATIM_HEADERS },
    );
    if (!res.ok) return null;
    const data: Array<{ lat: string; lon: string }> = await res.json();
    if (!data.length) return null;
    return [
      parseFloat(parseFloat(data[0].lat).toFixed(6)),
      parseFloat(parseFloat(data[0].lon).toFixed(6)),
    ];
  } catch {
    return null;
  }
}
