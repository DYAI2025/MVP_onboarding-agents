
import { Transit } from '../types';
import { REMOTE_TRANSITS_ENDPOINT } from '../src/config';

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const ZODIAC_ELEMENTS: Record<string, string> = {
  "Aries": "Fire", "Leo": "Fire", "Sagittarius": "Fire",
  "Taurus": "Earth", "Virgo": "Earth", "Capricorn": "Earth",
  "Gemini": "Air", "Libra": "Air", "Aquarius": "Air",
  "Cancer": "Water", "Scorpio": "Water", "Pisces": "Water"
};

// --- Remote API Logic (Production-ready, no local fallback) ---

export const fetchTransitsForDate = async (date: Date): Promise<Transit[]> => {
  if (!date || isNaN(date.getTime())) {
    throw new Error('Invalid date provided for transit calculation');
  }

  try {
    console.log(`[TransitService] Fetching transits for: ${date.toISOString()}`);

    const response = await fetch(`${REMOTE_TRANSITS_ENDPOINT}?date=${date.toISOString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Transit API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response format
    if (!Array.isArray(data) || data.length === 0 || !data[0].body || !data[0].sign) {
        throw new Error('Transit API returned invalid data format');
    }

    console.log(`✅ Received ${data.length} transits from remote API`);

    // Ensure element field exists (if API omits it)
    return data.map((t: any) => ({
        ...t,
        element: t.element || ZODIAC_ELEMENTS[t.sign] || "Fire"
    }));

  } catch (error) {
    console.error('[TransitService] Failed to fetch transits:', error);
    throw new Error(
      error instanceof Error 
        ? `Cosmic Weather unavailable: ${error.message}`
        : 'Cosmic Weather service is currently unavailable'
    );
  }
};

export const fetchCurrentTransits = async (): Promise<Transit[]> => {
  return fetchTransitsForDate(new Date());
};
