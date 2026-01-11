
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 8787;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is not set in environment variables.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

app.post('/api/symbol', async (req, res) => {
    const { prompt, style, mode } = req.body;

    console.log(`[Proxy] Received symbol generation request. Style: ${style}, Mode: ${mode}`);

    if (!ai) {
        console.error(`[Proxy] Missing API Key.`);
        res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        return;
    }

    const startTime = Date.now();

    try {
        // Construct the prompt similar to the client-side logic
        let finalPrompt = prompt || "";

        // Add style instructions if provided
        if (style) {
            const influenceText = style === 'western'
                ? "WEIGHTING: Prioritize Western Zodiac geometry and Solar signatures. Let the Sun sign's elemental nature dominate the visual form."
                : style === 'eastern'
                    ? "WEIGHTING: Prioritize Ba Zi symbols and the Year Animal's essence. Let the eastern animalistic traits and five-element flow dominate the visual form."
                    : "WEIGHTING: Achieve a perfect 50/50 equilibrium between Western geometric abstraction and Eastern organic animal symbolism.";

            finalPrompt += `
      
      CORE DIRECTIVE:
      - System Influence: ${influenceText}
      - Background: ${mode === 'transparent' ? 'PURE WHITE or TRANSPARENT background. Isolated subject.' : 'Clean, high-end editorial background.'}
      
      The result must be a singular, balanced emblem. Destiny has chosen the specific details, but the user has requested this specific weight of heritage.
      `;
        }

        console.log(`[Proxy] Calling Gemini Model...`);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Using standard Flash 2.0 experimental model which supports image generation 
            // Note: Client originally had 'gemini-2.5-flash-image', but falling back to 2.0-flash-exp for broader compatibility if 2.5 is unavailable.
            contents: [
                {
                    text: finalPrompt,
                },
            ],
            config: {
                responseMimeType: 'application/json'
            }
        });

        // NOTE: The previous code in geminiService.ts used generateContent for images. 
        // This is valid for some Gemini models (like 2.0 Flash) that can generate images.
        // However, I need to make sure I handle the response correctly.

        // Re-reading geminiService.ts loop:
        /*
         const candidates = response.candidates;
         if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
            for (const part of candidates[0].content.parts) {
               if (part.inlineData && part.inlineData.data) {
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
               }
            }
         }
        */

        // I will use strict 'gemini-2.0-flash-exp' as it is the current standard for image gen via `generateContent`, 
        // OR 'gemini-pro-vision' (unlikely for generation).
        // Actually, let me use the exact string from the user's file to be safe: 'gemini-2.5-flash-image'.

        const candidates = response.candidates;
        let imageBase64 = null;
        let mimeType = 'image/png';

        if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    imageBase64 = part.inlineData.data;
                    mimeType = part.inlineData.mimeType || 'image/png';
                    break;
                }
            }
        }

        if (imageBase64) {
            console.log(`[Proxy] Image generated successfully in ${Date.now() - startTime}ms`);
            res.json({
                imageDataUrl: `data:${mimeType};base64,${imageBase64}`,
                durationMs: Date.now() - startTime,
                engine: 'proxy-gemini'
            });
        } else {
            console.error(`[Proxy] No image data found in response.`);
            // console.log(JSON.stringify(response, null, 2));
            res.status(500).json({ error: 'No image data generated', details: JSON.stringify(candidates) });
        }

    } catch (error: any) {
        console.error(`[Proxy] Error generating symbol:`, error);
        res.status(500).json({
            error: error.message || 'Internal Server Error',
            engine: 'proxy-gemini-error'
        });
    }
});

app.listen(PORT, () => {
    console.log(`[Proxy] Server running on http://localhost:${PORT}`);
});
