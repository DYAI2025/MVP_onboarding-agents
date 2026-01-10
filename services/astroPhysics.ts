
import { BirthData, FusionResult, WesternAnalysis, EasternAnalysis } from '../types';

// --- Constants ---

const HEAVENLY_STEMS = [
  { name: "Jia", element: "Wood" },  // 0: Yang Wood
  { name: "Yi", element: "Wood" },   // 1: Yin Wood
  { name: "Bing", element: "Fire" }, // 2: Yang Fire
  { name: "Ding", element: "Fire" }, // 3: Yin Fire
  { name: "Wu", element: "Earth" },  // 4: Yang Earth
  { name: "Ji", element: "Earth" },  // 5: Yin Earth
  { name: "Geng", element: "Metal" },// 6: Yang Metal
  { name: "Xin", element: "Metal" }, // 7: Yin Metal
  { name: "Ren", element: "Water" }, // 8: Yang Water
  { name: "Gui", element: "Water" }  // 9: Yin Water
];

const EARTHLY_BRANCHES = [
  "Rat",    // 0: Zi (Water)
  "Ox",     // 1: Chou (Earth)
  "Tiger",  // 2: Yin (Wood)
  "Rabbit", // 3: Mao (Wood)
  "Dragon", // 4: Chen (Earth)
  "Snake",  // 5: Si (Fire)
  "Horse",  // 6: Wu (Fire)
  "Goat",   // 7: Wei (Earth)
  "Monkey", // 8: Shen (Metal)
  "Rooster",// 9: You (Metal)
  "Dog",    // 10: Xu (Earth)
  "Pig"     // 11: Hai (Water)
];

const ASTRONOMICAL_ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const ZODIAC_ELEMENTS: Record<string, string> = {
  "Aries": "Fire", "Leo": "Fire", "Sagittarius": "Fire",
  "Taurus": "Earth", "Virgo": "Earth", "Capricorn": "Earth",
  "Gemini": "Air", "Libra": "Air", "Aquarius": "Air",
  "Cancer": "Water", "Scorpio": "Water", "Pisces": "Water"
};

// --- Backend API Types ---

interface WesternBodyResponse {
  name: string;
  longitude: number;
  zodiac_sign: number; // 0=Aries
  degree_in_sign: number;
}

interface WesternChartResponse {
  bodies: Record<string, WesternBodyResponse>;
  houses: Record<string, number>;
  angles: {
    Ascendant: number;
    MC: number;
    Vertex: number;
  };
}

interface BaziPillarResponse {
    text: string;
    stem: number;
    branch: number;
}

interface BaziChartResponse {
    pillars: {
        year: BaziPillarResponse;
        month: BaziPillarResponse;
        day: BaziPillarResponse;
        hour: BaziPillarResponse;
    };
}

// --- Helper Functions ---

async function geocodeLocation(location: string): Promise<{ lat: number, lon: number }> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, {
            headers: {
                'User-Agent': 'AstroOnboardingApp/1.0'
            }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.warn("Geocoding failed, using default (Berlin)", e);
    }
    return { lat: 52.52, lon: 13.4050 }; // Default Berlin
}

function getZodiacSignName(index: number): string {
    return ASTRONOMICAL_ZODIAC[index % 12];
}

function getAscendantSign(ascLon: number): string {
    return ASTRONOMICAL_ZODIAC[Math.floor(ascLon / 30) % 12];
}

// --- Synthesis Logic (Preserved) ---

const synthesizeIdentity = (western: WesternAnalysis, eastern: EasternAnalysis) => {
  const { element: westernElement, sunSign, moonSign, ascendant } = western;
  const { yearAnimal: animal, yearElement: easternElement, dayElement: dayMaster } = eastern;

  let synthesisTitle = "The Resonant Traveler";
  let synthesisDescription = "Balancing the energies of motion and stillness.";
  let artisticDirective = "Focus on balanced intersections of curve and line.";

  // 1. Element Interaction Logic (Combining Western Element and Day Master)
  if (dayMaster === westernElement) {
     synthesisTitle = `The Pure ${dayMaster} Sovereign`;
     synthesisDescription = `Your core essence (${dayMaster}) is perfectly aligned with your astrological temperament. You possess an undiluted, focused power that resonates through every level of your being.`;
     artisticDirective = "Emphasize perfect symmetry and monochromatic elegance to reflect undiluted purity.";
  } else if (westernElement === "Fire" && dayMaster === "Wood") {
     synthesisTitle = "The Burning Visionary";
     synthesisDescription = "Wood feeds Fire. Your inner nature fuels your outward expression, creating a personality of tireless creativity and magnetic leadership.";
     artisticDirective = "Incorporate leaf-like organic motifs that transition into stylized, sharp flame geometry.";
  } else if (westernElement === "Water" && dayMaster === "Metal") {
     synthesisTitle = "The Fluid Alchemist";
     synthesisDescription = "Metal generates Water. Your disciplined mind and structured thoughts give rise to profound intuition and emotional depth.";
     artisticDirective = "Use sharp, metallic polished edges that contain or give birth to flowing, organic water-like curves.";
  } else if (westernElement === "Earth" && dayMaster === "Fire") {
     synthesisTitle = "The Volcanic Architect";
     synthesisDescription = "Fire creates Earth. Your inner passion is the foundation upon which you build your reality—solid, vibrant, and enduring.";
     artisticDirective = "Dense, heavy geometric bases with radiant, glowing interior lines suggesting subterranean energy.";
  } else if (westernElement === "Air" && dayMaster === "Water") {
     synthesisTitle = "The Mist Navigator";
     synthesisDescription = "Air moves Water. You are adaptable and elusive, finding your way through life's complexities with intellectual grace and emotional wisdom.";
     artisticDirective = "Whispy, ethereal strokes and concentric circles representing ripples in the sky.";
  } else if (dayMaster === "Earth") {
     synthesisTitle = "The Grounded Guardian";
     synthesisDescription = `Anchored by an Earth Day Master, you remain a stable force. Your ${westernElement} energy provides the drive, but your core remains unshakeable.`;
     artisticDirective = "Strong verticality and square-based abstractions with subtle elemental highlights.";
  }

  // 2. Animal-Specific Flair (Chinese Zodiac Year Animal)
  let animalVibe = "";
  switch(animal) {
    case 'Dragon': animalVibe = "mythical scales, winding serpent-like power, celestial orbs, and imperial authority"; break;
    case 'Tiger': animalVibe = "bold stripes, predatory grace, hidden explosive strength in the linework"; break;
    case 'Rat': animalVibe = "intricate small-scale detail, clever geometry, hidden nodes of resourcefulness"; break;
    case 'Snake': animalVibe = "sleek infinity loops, transformative skin patterns, winding wisdom"; break;
    case 'Horse': animalVibe = "galloping motion lines, wind-swept mane geometry, unbridled spirit"; break;
    case 'Rabbit': animalVibe = "soft lunar curves, alert stillness, hidden agility in the negative space"; break;
    case 'Rooster': animalVibe = "radiant crest patterns, morning-sun geometry, precision and punctuality"; break;
    case 'Monkey': animalVibe = "dynamic playful shapes, versatile joints, clever intersections"; break;
    case 'Goat': animalVibe = "peaceful cloud-like textures, spiral horn geometry, artistic harmony"; break;
    case 'Ox': animalVibe = "heavy steady strokes, mountain-like mass, patient power"; break;
    case 'Dog': animalVibe = "protective border structures, loyal center-points, grounded integrity"; break;
    case 'Pig': animalVibe = "plentiful rounded forms, abundance motifs, gentle inclusive circles"; break;
    default: animalVibe = `the essential spirit of the ${animal}`;
  }

  // 3. Sun/Ascendant Nuance
  const celestialFocus = `Reflecting the core light of ${sunSign} and the rising mask of ${ascendant}.`;

  const prompt = `
    Design Language: Fine-line, minimal, elegant, high-end identity mark, geometric calm composition, central emblem, ample negative space, precise line weight, vector-like clarity.
    
    Astrological Profile:
    - Western Sun: ${sunSign}
    - Western Ascendant: ${ascendant}
    - Chinese Year: ${easternElement} ${animal}
    - Day Master: ${dayMaster}
    - Interaction Theme: ${synthesisTitle}

    Visual Subject: An abstract fusion of a ${animal} and the sacred geometry of the ${westernElement} element.
    Artistic Directive: ${artisticDirective} Incorporate elements of ${animalVibe}.
    
    Composition: A central celestial structure. 
    - Element of ${westernElement}: ${
      westernElement === 'Fire' ? 'Radiating sparks, sharp upward vertices, glowing embers.' : 
      westernElement === 'Water' ? 'Soft overlapping waves, teardrop geometry, fluid sine-waves.' : 
      westernElement === 'Earth' ? 'Layered strata, crystalline blocks, solid foundations.' : 
      'Thin sweeping arcs, atmospheric transparency, parallel wind-lines.'
    }
    
    Specific Details: 
    - Include a specific golden node on an outer orbit representing the ${sunSign} sun placement.
    - The overall mark should reflect the ${synthesisTitle} theme.
    - Avoid literal or cartoonish depictions; aim for a high-end luxury brand emblem or watch-face detail.
    - Color Palette: ${
      westernElement === 'Fire' ? 'Warm Gold, Ochre, and Charcoal' : 
      westernElement === 'Water' ? 'Deep Indigo, Silver, and Pearl' : 
      westernElement === 'Earth' ? 'Copper, Moss Green, and Sand' : 
      'Champagne, Slate Blue, and White'
    }.
    
    Vibe: No text. No 3D perspective. Icon-ready. ${celestialFocus}
  `.trim();

  return { synthesisTitle, synthesisDescription, prompt };
};

// --- Main Async Function ---

export const runFusionAnalysis = async (data: BirthData): Promise<FusionResult> => {
  // 1. Geocode
  const { lat, lon } = await geocodeLocation(data.location);

  // 2. Prepare payload
  const isoDate = `${data.date}T${data.time}:00`;
  
  const payload = {
    date: isoDate,
    tz: "Europe/Berlin", // TODO: Determine TZ from Lat/Lon? For now assume Berlin/CET based on user base
    lat,
    lon
  };

  try {
      // 3. Fetch Western
      const westernRes = await fetch('/api/bazi/calculate/western', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      if (!westernRes.ok) throw new Error("Western calc failed");
      const westernData: WesternChartResponse = await westernRes.json();

      // 4. Fetch BaZi
      const baziRes = await fetch('/api/bazi/calculate/bazi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, standard: "CIVIL", boundary: "midnight" })
      });
      if (!baziRes.ok) throw new Error("BaZi calc failed");
      const baziData: BaziChartResponse = await baziRes.json();

      // 5. Map to Frontend Types
      const sunSign = getZodiacSignName(westernData.bodies["Sun"].zodiac_sign);
      const moonSign = getZodiacSignName(westernData.bodies["Moon"].zodiac_sign);
      const ascendant = getAscendantSign(westernData.angles.Ascendant);
      const westernElement = ZODIAC_ELEMENTS[sunSign] || "Air";

      const yearPillar = baziData.pillars.year;
      const dayPillar = baziData.pillars.day;

      const yearAnimal = EARTHLY_BRANCHES[yearPillar.branch];
      const yearElementKey = HEAVENLY_STEMS[yearPillar.stem].element; // "Wood"
      
      const dayElementKey = HEAVENLY_STEMS[dayPillar.stem].element;
      const dayStemName = HEAVENLY_STEMS[dayPillar.stem].name;
      const dayPolarity = dayPillar.stem % 2 === 0 ? 'Yang' : 'Yin';

      const western: WesternAnalysis = {
          sunSign,
          moonSign,
          ascendant,
          element: westernElement
      };

      const eastern: EasternAnalysis = {
          yearAnimal,
          yearElement: yearElementKey,
          monthAnimal: EARTHLY_BRANCHES[baziData.pillars.month.branch],
          dayElement: dayElementKey,
          dayStem: dayStemName,
          dayPolarity
      };

      // 6. Synthesize
      const { synthesisTitle, synthesisDescription, prompt } = synthesizeIdentity(western, eastern);

      return {
          synthesisTitle,
          synthesisDescription,
          elementMatrix: `${western.element} (Sun) / ${eastern.dayElement} (Day Master)`,
          western,
          eastern,
          prompt
      };

  } catch (e) {
      console.error("Fusion Analysis Failed:", e);
      throw e;
  }
};
