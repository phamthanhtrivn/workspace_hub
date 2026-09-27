export const openStreetMapUrl = process.env.NEXT_PUBLIC_NOMINATIM_URL!;

export interface LocationSuggestion {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

export async function searchLocationSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const url = `${openStreetMapUrl}?format=json&q=${encodeURIComponent(
      trimmed,
    )}&limit=5&addressdetails=1`;

    const response = await fetch(url, {
      signal,
      headers: {
        "Accept-Language": "en,vi",
      },
    });

    if (!response.ok) return [];
    const data = (await response.json()) as LocationSuggestion[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
