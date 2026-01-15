import { Router, Request, Response } from 'express';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_ELEMENTS: Record<string, string> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water'
};

const getJulianDate = (date: Date) => {
  const time = date.getTime();
  if (Number.isNaN(time)) return 2440587.5;
  return (time / 86400000) + 2440587.5;
};

const normalize = (deg: number) => {
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

const getMoonPosition = (date: Date) => {
  const jd = getJulianDate(date);
  const d = jd - 2451545.0;
  const L = 218.316 + 13.176396 * d;
  const M = 134.963 + 13.064993 * d;
  const toRad = (deg: number) => deg * (Math.PI / 180);

  let lambda = L + 6.289 * Math.sin(toRad(normalize(M)));
  lambda = normalize(lambda);

  const signIndex = Math.floor(lambda / 30);
  const degree = Math.floor(lambda % 30);

  return {
    sign: ZODIAC_SIGNS[signIndex % 12] || 'Aries',
    degree: Number.isNaN(degree) ? 0 : degree
  };
};

const getSunPosition = (date: Date) => {
  const year = date.getFullYear();
  if (Number.isNaN(year)) return { sign: 'Aries', degree: 0 };

  const start = new Date(year, 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  // 80 ≈ day-of-year of the (mean) vernal equinox (around March 21), used as the zero point for Aries.
  // 0.9856 ≈ mean daily motion of the Sun in ecliptic longitude (degrees per day: ~360 / 365.24).
  let degrees = (dayOfYear - 80) * 0.9856;
  if (degrees < 0) degrees += 360;
  const signIndex = Math.floor(degrees / 30);
  const degree = Math.floor(degrees % 30);
  return {
    sign: ZODIAC_SIGNS[signIndex % 12] || 'Aries',
    degree: Number.isNaN(degree) ? 0 : degree
  };
};

const getPlanetPosition = (date: Date, planet: string) => {
  const jd = getJulianDate(date);

  const periods: Record<string, number> = {
    Mercury: 87.97,
    Venus: 224.7,
    Mars: 686.98,
    Jupiter: 4332.59,
    Saturn: 10759.22,
    Uranus: 30688.5,
    Neptune: 60182,
    Pluto: 90560
  };

  // Simple per-planet retrograde pattern so the heuristic
  // is explicitly planet-dependent.
  const retrogradePatterns: Record<string, { frequency: number; phase: number }> = {
    Mercury: { frequency: 60, phase: 0 },
    Venus: { frequency: 80, phase: 0.5 },
    Mars: { frequency: 120, phase: 1 },
    Jupiter: { frequency: 200, phase: 1.5 },
    Saturn: { frequency: 260, phase: 2 },
    Uranus: { frequency: 320, phase: 2.5 },
    Neptune: { frequency: 380, phase: 3 },
    Pluto: { frequency: 440, phase: 3.5 }
  };

  const period = periods[planet] || 365;
  const baseDeg = (jd % period) / period * 360;
  const signIndex = Math.floor(baseDeg / 30);
  const degree = Math.floor(baseDeg % 30);

  const retroPattern = retrogradePatterns[planet] || { frequency: 180, phase: 0 };
  const retroSignal = Math.sin(jd / retroPattern.frequency + retroPattern.phase);
  const isRetro = retroSignal < -0.8;

  return {
    sign: ZODIAC_SIGNS[signIndex % 12] || 'Aries',
    degree: Number.isNaN(degree) ? 0 : degree,
    // NOTE: This retrograde flag is a simplified MVP placeholder based on an arbitrary sine threshold.
    // For production use, replace with proper ephemeris-based retrograde calculations.
    isRetro
  };
};

const calculateLocalTransits = (date: Date) => {
  const sun = getSunPosition(date);
  const moon = getMoonPosition(date);

  return [
    { body: 'Sun', sign: sun.sign, degree: sun.degree, isRetrograde: false, element: ZODIAC_ELEMENTS[sun.sign] || 'Fire' },
    { body: 'Moon', sign: moon.sign, degree: moon.degree, isRetrograde: false, element: ZODIAC_ELEMENTS[moon.sign] || 'Water' },
    ...['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((planet) => {
      const pos = getPlanetPosition(date, planet);
      return {
        body: planet,
        sign: pos.sign,
        degree: pos.degree,
        isRetrograde: pos.isRetro,
        element: ZODIAC_ELEMENTS[pos.sign] || 'Earth'
      };
    })
  ];
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', (req: Request, res: Response) => {
  const dateParam = typeof req.query.date === 'string' ? req.query.date : '';

  let date: Date;

  if (dateParam) {
    // Require an explicit, predictable format (YYYY-MM-DD) and normalize to UTC
    if (!ISO_DATE_REGEX.test(dateParam)) {
      const error = new GatewayError(
        'INVALID_DATE',
        'Invalid date query parameter format. Expected YYYY-MM-DD.',
        400
      );
      res.status(error.statusCode).json(formatErrorResponse(error, req.id));
      return;
    }

    const [yearStr, monthStr, dayStr] = dateParam.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    const utcTime = Date.UTC(year, month - 1, day);
    date = new Date(utcTime);

    // Validate that the parsed date matches the input to avoid rollover (e.g. 2024-13-40)
    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      const error = new GatewayError('INVALID_DATE', 'Invalid date query parameter', 400);
      res.status(error.statusCode).json(formatErrorResponse(error, req.id));
      return;
    }
  } else {
    // Default to current time as an explicit UTC instant rather than relying on locale-dependent parsing
    date = new Date();
  }

  const transits = calculateLocalTransits(date);
  res.json(transits);
});

export default router;
