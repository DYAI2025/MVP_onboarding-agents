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
    Mercury: 87.97, Venus: 224.7, Mars: 686.98,
    Jupiter: 4332.59, Saturn: 10759.22, Uranus: 30688.5,
    Neptune: 60182, Pluto: 90560
  };
  const period = periods[planet] || 365;
  const baseDeg = (jd % period) / period * 360;
  const signIndex = Math.floor(baseDeg / 30);
  const degree = Math.floor(baseDeg % 30);
  return {
    sign: ZODIAC_SIGNS[signIndex % 12] || 'Aries',
    degree: Number.isNaN(degree) ? 0 : degree,
    isRetro: Math.sin(jd / 100) < -0.8
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

router.get('/', (req: Request, res: Response) => {
  const dateParam = typeof req.query.date === 'string' ? req.query.date : '';
  const date = dateParam ? new Date(dateParam) : new Date();

  if (Number.isNaN(date.getTime())) {
    const error = new GatewayError('INVALID_DATE', 'Invalid date query parameter', 400);
    res.status(error.statusCode).json(formatErrorResponse(error, req.id));
    return;
  }

  const transits = calculateLocalTransits(date);
  res.json(transits);
});

export default router;
