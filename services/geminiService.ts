
import { DEMO_MODE, REMOTE_SYMBOL_ENDPOINT, LOCAL_PROXY_URL } from '../src/config';

export interface SymbolConfig {
  influence: 'western' | 'balanced' | 'eastern';
  transparentBackground?: boolean;
}

export interface GenerationResult {
  imageUrl: string;
  engineUsed: 'remote' | 'proxy' | 'placeholder' | 'demo_local_svg';
  durationMs?: number;
  error?: string;
}

/**
 * Generates a deterministic SVG based on a hash of the prompt.
 * Always succeeds, requires no network.
 */
const generateLocalSVG = (prompt: string, config?: SymbolConfig): string => {
  // Simple hash function to get a number from string
  let hash = 0;
  const str = prompt + JSON.stringify(config || {});
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const hue = Math.abs(hash % 360);
  const hue2 = (hue + 40) % 360;

  // Choose shape based on hash mod
  const shapeType = Math.abs(hash) % 3;
  let shapePath = "";

  // Center is 50,50. Radius 30.
  if (shapeType === 0) { // Circle-ish
    shapePath = `<circle cx="50" cy="50" r="30" stroke="white" stroke-width="1" fill="none" opacity="0.8" />
                  <circle cx="50" cy="50" r="20" stroke="white" stroke-width="0.5" fill="none" opacity="0.5" />`;
  } else if (shapeType === 1) { // Hexagon/Polygon
    shapePath = `<path d="M50 20 L80 35 L80 65 L50 80 L20 65 L20 35 Z" stroke="white" stroke-width="1" fill="none" opacity="0.8" />
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" stroke="white" stroke-width="0.5" fill="none" opacity="0.3" />`;
  } else { // Star/Diamond
    shapePath = `<path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" stroke="white" stroke-width="1" fill="none" opacity="0.8" />`;
  }

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="background: linear-gradient(135deg, hsl(${hue}, 60%, 20%), hsl(${hue2}, 60%, 10%)); width: 100%; height: 100%;">
    <!-- Procedural Pattern -->
    <defs>
      <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.1" opacity="0.1"/>
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#grid)" />
    
    <!-- Dynamic Shape -->
    <g transform="translate(0, 0)">
       ${shapePath}
    </g>
    
    <!-- Text Overlay -->
    <text x="50" y="95" font-family="monospace" font-size="4" fill="white" text-anchor="middle" opacity="0.5">UNK-${Math.abs(hash).toString(16).substring(0, 4).toUpperCase()}</text>
  </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const generateSymbol = async (basePrompt: string, config?: SymbolConfig): Promise<GenerationResult> => {
  const startTime = Date.now();

  // 0. CHECK DEMO MODE (Happy Path Forcing)
  if (DEMO_MODE) {
    console.log("[SymbolService] DEMO_MODE active. Skipping network calls. Generating local SVG.");
    // Simulate slight delay for "feeling"
    await new Promise(r => setTimeout(r, 800));

    return {
      imageUrl: generateLocalSVG(basePrompt, config),
      engineUsed: 'demo_local_svg',
      durationMs: Date.now() - startTime
    };
  }

  // 1. Attempt Instant Remote Generation (BaziEngine v2)
  try {
    console.log(`[SymbolService] Requesting instant symbol from ${REMOTE_SYMBOL_ENDPOINT}...`);

    const payload = {
      prompt: basePrompt,
      style: config?.influence || 'balanced',
      mode: config?.transparentBackground ? 'transparent' : 'cinematic'
    };

    const response = await fetch(REMOTE_SYMBOL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.imageUrl || data.imageDataUrl;
      if (imageUrl) {
        console.log("✅ Instant symbol received from remote engine.");
        return {
          imageUrl,
          engineUsed: 'remote',
          durationMs: Date.now() - startTime
        };
      }
    } else {
      console.warn(`⚠️ Remote engine returned ${response.status}. Switching to local Proxy.`);
    }
  } catch (error) {
    console.warn("❌ Remote engine unreachable or timed out. Falling back to Proxy.", error);
  }

  // 2. Fallback: Local Proxy (calls Gemini server-side)
  try {
    console.log(`[SymbolService] Requesting symbol from Proxy (${LOCAL_PROXY_URL})...`);

    const payload = {
      prompt: basePrompt,
      style: config?.influence || 'balanced',
      mode: config?.transparentBackground ? 'transparent' : 'cinematic'
    };

    const response = await fetch(LOCAL_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.imageDataUrl) {
        console.log("✅ Symbol received from Proxy.");
        return {
          imageUrl: data.imageDataUrl,
          engineUsed: 'proxy',
          durationMs: Date.now() - startTime
        };
      }
    } else {
      const errText = await response.text();
      console.warn(`⚠️ Proxy returned ${response.status}. Switching to local SVG.`);
    }

  } catch (error) {
    console.error("❌ Proxy error:", error);
  }

  // 3. Final Fallback: Local SVG (Determinism)
  // Instead of generic placeholder image that requires network (picsum), use local generator
  console.warn("⚠️ All network engines failed. Generating local fallback symbol.");
  return {
    imageUrl: generateLocalSVG(basePrompt, config), // Now using local SVG instead of picsum
    engineUsed: 'demo_local_svg', // Treat as same fallback class
    durationMs: Date.now() - startTime,
    error: 'All engines failed, fallback engaged'
  };
};
