export interface WeatherDayForecast {
  date: string;
  tempMaxC: number;
  rainMm: number;
  weatherCode: number;
  conditionLabel: string;
  turnoutMultiplier: number;
}

const CITY_COORDINATES: Record<string, { lat: number; lon: number; label: string }> = {
  mumbai: { lat: 19.076, lon: 72.8777, label: "Mumbai" },
  pune: { lat: 18.5204, lon: 73.8567, label: "Pune" },
  delhi: { lat: 28.6139, lon: 77.209, label: "New Delhi" },
  bengaluru: { lat: 12.9716, lon: 77.5946, label: "Bengaluru" },
  bangalore: { lat: 12.9716, lon: 77.5946, label: "Bengaluru" },
  chennai: { lat: 13.0827, lon: 80.2707, label: "Chennai" },
  hyderabad: { lat: 17.385, lon: 78.4867, label: "Hyderabad" },
  kolkata: { lat: 22.5726, lon: 88.3639, label: "Kolkata" },
  kanpur: { lat: 26.4499, lon: 80.3319, label: "Kanpur" },
  roorkee: { lat: 29.8543, lon: 77.888, label: "Roorkee" },
  jaipur: { lat: 26.9124, lon: 75.7873, label: "Jaipur" },
};

export function resolveCityCoordinates(cityState?: string): {
  lat: number;
  lon: number;
  label: string;
} {
  const normalized = (cityState || "").trim().toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalized.includes(key)) return coords;
  }
  return CITY_COORDINATES["delhi"] ?? { lat: 28.6139, lon: 77.209, label: "New Delhi" };
}

export function classifyOpenMeteoWeather(
  rainMm: number,
  tempMaxC: number,
): {
  conditionLabel: string;
  turnoutMultiplier: number;
} {
  if (rainMm >= 8) {
    return { conditionLabel: "Heavy Rain (Higher Hostel Stay-In)", turnoutMultiplier: 1.08 };
  }
  if (rainMm >= 1.5) {
    return { conditionLabel: "Light Rain", turnoutMultiplier: 1.04 };
  }
  if (tempMaxC >= 40) {
    return { conditionLabel: "Peak Heatwave (More Cold Beverages)", turnoutMultiplier: 0.96 };
  }
  return { conditionLabel: "Clear / Pleasant", turnoutMultiplier: 1.0 };
}

/**
 * Fetches 7-day daily weather using Open-Meteo (free, no API key required).
 * Falls back cleanly to neutral multipliers if the network is unreachable.
 */
export async function fetchOpenMeteoForecast(cityState?: string): Promise<{
  locationLabel: string;
  source: "open-meteo" | "fallback";
  days: WeatherDayForecast[];
}> {
  const coords = resolveCityCoordinates(cityState);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,precipitation_sum,weathercode&timezone=Asia%2FKolkata&forecast_days=7`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        precipitation_sum?: number[];
        weathercode?: number[];
      };
    };

    const times = data.daily?.time ?? [];
    const temps = data.daily?.temperature_2m_max ?? [];
    const rains = data.daily?.precipitation_sum ?? [];
    const codes = data.daily?.weathercode ?? [];

    if (!times.length) throw new Error("Empty daily array");

    const days: WeatherDayForecast[] = times.map((date, idx) => {
      const tempMaxC = Number(temps[idx] ?? 30);
      const rainMm = Number(rains[idx] ?? 0);
      const weatherCode = Number(codes[idx] ?? 0);
      const classified = classifyOpenMeteoWeather(rainMm, tempMaxC);
      return {
        date,
        tempMaxC,
        rainMm,
        weatherCode,
        conditionLabel: classified.conditionLabel,
        turnoutMultiplier: classified.turnoutMultiplier,
      };
    });

    return { locationLabel: coords.label, source: "open-meteo", days };
  } catch {
    const today = new Date();
    const days: WeatherDayForecast[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getTime() + i * 86_400_000);
      return {
        date: d.toISOString().slice(0, 10),
        tempMaxC: 30,
        rainMm: 0,
        weatherCode: 0,
        conditionLabel: "Neutral (Offline Baseline)",
        turnoutMultiplier: 1.0,
      };
    });
    return { locationLabel: coords.label, source: "fallback", days };
  }
}

export function computeFormulaDemandForecast(params: {
  activeStudents: number;
  skippedCount: number;
  guestCount: number;
  eventFactor?: number;
  weatherMultiplier?: number;
  mealSlot?: "breakfast" | "lunch" | "snacks" | "dinner";
}): { expectedPortions: number; confidence: number; rationale: string } {
  const slotBaseline: Record<string, number> = {
    breakfast: 0.78,
    lunch: 0.92,
    snacks: 0.65,
    dinner: 0.88,
  };
  const ratio = slotBaseline[params.mealSlot ?? "lunch"] ?? 0.85;
  const base = Math.max(0, params.activeStudents) * ratio;
  const adjusted =
    (base - Math.max(0, params.skippedCount) + Math.max(0, params.guestCount)) *
    (params.eventFactor ?? 1) *
    (params.weatherMultiplier ?? 1);
  const expectedPortions = Math.max(0, Math.round(adjusted));
  const confidence = params.activeStudents > 0 ? 84 : 60;
  return {
    expectedPortions,
    confidence,
    rationale: `Formula: (${params.activeStudents} active × ${Math.round(ratio * 100)}% − ${params.skippedCount} skips + ${params.guestCount} guests) × ${(params.weatherMultiplier ?? 1).toFixed(2)} weather`,
  };
}

export function computeFormulaMenuSuggestions(params: {
  expiringItems: { name: string; quantity: number; unit: string; expiryDate: string | null }[];
  wasteLogs: { dishName: string; wastedQuantity: number; preparedQuantity: number }[];
  lang: "en" | "hi";
}): string[] {
  const tips: string[] = [];
  if (params.expiringItems.length > 0) {
    const names = params.expiringItems
      .slice(0, 3)
      .map((i) => `${i.name} (${i.quantity} ${i.unit})`)
      .join(", ");
    tips.push(
      params.lang === "hi"
        ? `FEFO प्राथमिकता: जल्द समाप्त होने वाली सामग्री (${names}) का उपयोग अगले लंच/डिनर मेनू में पहले करें।`
        : `FEFO Priority: Schedule ${names} into tomorrow's lunch/dinner menu before expiry.`,
    );
  }
  const highWasteDish = [...params.wasteLogs].sort(
    (a, b) => b.wastedQuantity - a.wastedQuantity,
  )[0];
  if (highWasteDish && highWasteDish.preparedQuantity > 0) {
    const pct = Math.round((highWasteDish.wastedQuantity / highWasteDish.preparedQuantity) * 100);
    tips.push(
      params.lang === "hi"
        ? `अपव्यय चेतावनी: '${highWasteDish.dishName}' में ${pct}% अपव्यय दर्ज हुआ — बैच आकार 15% कम करें।`
        : `Portion Trim: '${highWasteDish.dishName}' saw ${pct}% leftovers — reduce batch prep by 15% or cook in staggered batches.`,
    );
  }
  if (tips.length === 0) {
    tips.push(
      params.lang === "hi"
        ? "नियमित टिप: पनीर/दाल की खपत के अनुसार साप्ताहिक रोस्टर में 20% बैच बफर रखें।"
        : "Smart Kitchen Tip: Use staggered 50-portion cooking batches during the last 30 minutes of dinner service to keep plate waste under 5%.",
    );
  }
  return tips;
}
