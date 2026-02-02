import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();

const TOOL_SECRET = process.env.ELEVENLABS_TOOL_SECRET;
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

if (!TOOL_SECRET) {
    console.error('[FATAL] ELEVENLABS_TOOL_SECRET not set. Chart webhook will reject all requests.');
}

// --- Western Zodiac Data ---
const ZODIAC_ELEMENTS: Record<string, string> = {
    "Aries": "Fire", "Leo": "Fire", "Sagittarius": "Fire",
    "Taurus": "Earth", "Virgo": "Earth", "Capricorn": "Earth",
    "Gemini": "Air", "Libra": "Air", "Aquarius": "Air",
    "Cancer": "Water", "Scorpio": "Water", "Pisces": "Water"
};

// --- Eastern Ba Zi Data (Sexagenary Cycle) ---
const HEAVENLY_STEMS = [
    { name: "Jia", element: "Wood" },  // Yang Wood
    { name: "Yi", element: "Wood" },   // Yin Wood
    { name: "Bing", element: "Fire" }, // Yang Fire
    { name: "Ding", element: "Fire" }, // Yin Fire
    { name: "Wu", element: "Earth" },  // Yang Earth
    { name: "Ji", element: "Earth" },  // Yin Earth
    { name: "Geng", element: "Metal" },// Yang Metal
    { name: "Xin", element: "Metal" }, // Yin Metal
    { name: "Ren", element: "Water" }, // Yang Water
    { name: "Gui", element: "Water" }  // Yin Water
];

const EARTHLY_BRANCHES = [
    "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
    "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
];

const ASTRONOMICAL_ZODIAC = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const SOLAR_TERM_START_DAYS = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7];

// --- Calculation Functions ---

function getWesternSign(date: Date): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;

    if ((month == 1 && day <= 19) || (month == 12 && day >= 22)) return "Capricorn";
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "Aquarius";
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Pisces";
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Aries";
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Taurus";
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return "Gemini";
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return "Cancer";
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Leo";
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Virgo";
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "Libra";
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return "Scorpio";
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return "Sagittarius";
    return "Aries";
}

function calculateMoonSign(date: Date): string {
    const jd = (date.getTime() / 86400000) + 2440587.5;
    const d = jd - 2451545.0;
    const L = 218.316 + 13.176396 * d;
    const M = 134.963 + 13.064993 * d;

    const normalize = (deg: number) => {
        deg = deg % 360;
        if (deg < 0) deg += 360;
        return deg;
    };
    const toRad = (deg: number) => deg * (Math.PI / 180);

    let lambda = L + 6.289 * Math.sin(toRad(normalize(M)));
    lambda = normalize(lambda);

    const signIndex = Math.floor(lambda / 30);
    return ASTRONOMICAL_ZODIAC[signIndex % 12];
}

function calculateAscendant(sign: string, hour: number): string {
    const ZODIAC_SIGNS = [
        "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini",
        "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"
    ];
    const signIndex = ZODIAC_SIGNS.indexOf(sign);
    const offset = Math.floor((hour - 6) / 2);
    const ascIndex = (signIndex + offset + 12) % 12;
    return ZODIAC_SIGNS[ascIndex];
}

function calculateBaZi(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Ba Zi year starts at Li Chun (around Feb 4)
    let baZiYear = year;
    if (month < 1 || (month === 1 && day < 4)) {
        baZiYear -= 1;
    }

    // Year Pillar
    const yearStemIndex = ((baZiYear - 4) % 10 + 10) % 10;
    const yearBranchIndex = ((baZiYear - 4) % 12 + 12) % 12;
    const yearElement = HEAVENLY_STEMS[yearStemIndex].element;
    const yearAnimal = EARTHLY_BRANCHES[yearBranchIndex];

    // Month Pillar (based on solar terms)
    const cutoffDay = SOLAR_TERM_START_DAYS[month];
    const solarMonthMapping = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
    let monthBranchIndex;

    if (day >= cutoffDay) {
        monthBranchIndex = solarMonthMapping[month];
    } else {
        const prevMonthIdx = month === 0 ? 11 : month - 1;
        monthBranchIndex = solarMonthMapping[prevMonthIdx];
    }
    const monthAnimal = EARTHLY_BRANCHES[monthBranchIndex];

    // Day Pillar
    const refDate = new Date(Date.UTC(1900, 0, 1));
    const targetDate = new Date(Date.UTC(year, month, day));
    const diffTime = targetDate.getTime() - refDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const dayStemIndex = ((4 + diffDays) % 10 + 10) % 10;
    const dayBranchIndex = ((10 + diffDays) % 12 + 12) % 12;
    const dayElement = HEAVENLY_STEMS[dayStemIndex].element;
    const dayStemName = HEAVENLY_STEMS[dayStemIndex].name;
    const dayPolarity = dayStemIndex % 2 === 0 ? 'Yang' : 'Yin';
    const dayAnimal = EARTHLY_BRANCHES[dayBranchIndex];

    return {
        yearAnimal,
        yearElement,
        monthAnimal,
        dayAnimal,
        dayElement,
        dayStemName,
        dayPolarity
    };
}

// --- HMAC Signature Verification ---

function verifyToolSignature(
    payload: Buffer,
    signatureHeader: string | undefined,
    secret: string
): boolean {
    if (!signatureHeader) {
        throw new GatewayError('UNAUTHORIZED', 'Missing ElevenLabs-Signature header', 401);
    }

    // Parse signature header: "t=<timestamp>,v1=<signature>"
    const parts = signatureHeader.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
        throw new GatewayError('UNAUTHORIZED', 'Invalid signature header format', 401);
    }

    const timestamp = parseInt(timestampPart.split('=')[1], 10);
    const providedSignature = signaturePart.split('=')[1];

    // Check timestamp tolerance (prevent replay attacks)
    const now = Date.now();
    if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_MS) {
        throw new GatewayError('UNAUTHORIZED', 'Signature timestamp too old or too new', 401);
    }

    // Compute expected signature: HMAC-SHA256(timestamp + "." + payload, secret)
    const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`), payload]);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

    // Constant-time comparison
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

// --- Request/Response Interfaces ---

interface ChartRequest {
    birthDate: string;  // ISO date: "1990-05-15"
    birthTime?: string; // HH:MM: "14:30" (optional, defaults to 12:00)
    timezone?: string;  // e.g., "Europe/Berlin" (for future use)
}

interface ChartResponse {
    western: {
        sunSign: string;
        moonSign: string;
        ascendant: string;
        element: string;
    };
    eastern: {
        yearAnimal: string;
        yearElement: string;
        monthAnimal: string;
        dayAnimal: string;
        dayElement: string;
        dayStemName: string;
        dayPolarity: string;
    };
    summary: {
        westernSign: string;
        chineseZodiac: string;
        dayMaster: string;
        elementBalance: string;
    };
}

// --- Webhook Endpoint ---

/**
 * ElevenLabs Agent Tool: Get Astrology Chart
 *
 * POST /api/webhooks/chart
 *
 * This endpoint is called by ElevenLabs agents to retrieve zodiac and BaZi
 * information for a user based on their birth date.
 *
 * Request body:
 * {
 *   "birthDate": "1990-05-15",
 *   "birthTime": "14:30"  // optional
 * }
 *
 * Response:
 * {
 *   "western": { sunSign, moonSign, ascendant, element },
 *   "eastern": { yearAnimal, yearElement, monthAnimal, ... },
 *   "summary": { westernSign, chineseZodiac, dayMaster, elementBalance }
 * }
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        // 1. Verify HMAC signature
        if (!TOOL_SECRET) {
            throw new GatewayError('UNAUTHORIZED', 'Tool secret not configured', 401);
        }

        const rawBody = Buffer.isBuffer(req.body) ? req.body : req.rawBody;
        if (!rawBody || !Buffer.isBuffer(rawBody)) {
            throw new GatewayError(
                'INVALID_INPUT',
                'Missing raw request body for signature verification',
                400
            );
        }

        const signatureHeader = req.headers['elevenlabs-signature'] as string | undefined;
        const isValid = verifyToolSignature(rawBody, signatureHeader, TOOL_SECRET);
        if (!isValid) {
            throw new GatewayError('UNAUTHORIZED', 'Invalid tool signature', 401);
        }

        // 2. Parse payload
        let payload: ChartRequest;
        try {
            payload = JSON.parse(rawBody.toString('utf8')) as ChartRequest;
        } catch (parseError: unknown) {
            const message = parseError instanceof Error ? parseError.message : 'Invalid JSON';
            throw new GatewayError('INVALID_INPUT', `Unable to parse request: ${message}`, 400);
        }

        // 3. Validate required fields
        if (!payload.birthDate) {
            throw new GatewayError('INVALID_INPUT', 'birthDate is required (format: YYYY-MM-DD)', 400);
        }

        // Parse birth date and time
        const birthTime = payload.birthTime || '12:00';
        const dateTimeStr = `${payload.birthDate}T${birthTime}:00`;
        const birthDateTime = new Date(dateTimeStr);

        if (isNaN(birthDateTime.getTime())) {
            throw new GatewayError(
                'INVALID_INPUT',
                'Invalid birthDate or birthTime format. Use YYYY-MM-DD for date and HH:MM for time.',
                400
            );
        }

        console.log(`[Chart Webhook] Calculating chart for: ${payload.birthDate} ${birthTime}`);

        // 4. Calculate Western astrology
        const sunSign = getWesternSign(birthDateTime);
        const moonSign = calculateMoonSign(birthDateTime);
        const hour = birthDateTime.getHours();
        const ascendant = calculateAscendant(sunSign, hour);
        const westernElement = ZODIAC_ELEMENTS[sunSign] || "Unknown";

        // 5. Calculate Eastern (BaZi) astrology
        const bazi = calculateBaZi(birthDateTime);

        // 6. Build response
        const response: ChartResponse = {
            western: {
                sunSign,
                moonSign,
                ascendant,
                element: westernElement
            },
            eastern: {
                yearAnimal: bazi.yearAnimal,
                yearElement: bazi.yearElement,
                monthAnimal: bazi.monthAnimal,
                dayAnimal: bazi.dayAnimal,
                dayElement: bazi.dayElement,
                dayStemName: bazi.dayStemName,
                dayPolarity: bazi.dayPolarity
            },
            summary: {
                westernSign: `${sunSign} (${westernElement})`,
                chineseZodiac: `${bazi.yearElement} ${bazi.yearAnimal}`,
                dayMaster: `${bazi.dayPolarity} ${bazi.dayElement} (${bazi.dayStemName})`,
                elementBalance: `Western: ${westernElement} | Eastern Day: ${bazi.dayElement}`
            }
        };

        console.log(`[Chart Webhook] Success: ${sunSign}, ${bazi.yearElement} ${bazi.yearAnimal}`);

        res.json(response);

    } catch (error: unknown) {
        if (error instanceof GatewayError) {
            res.status(error.statusCode).json(formatErrorResponse(error, req.id));
            return;
        }
        console.error('[Chart Webhook] Unexpected error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Chart calculation failed' },
            request_id: req.id
        });
    }
});

export default router;
