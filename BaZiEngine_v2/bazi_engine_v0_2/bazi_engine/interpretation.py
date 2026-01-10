from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class InterpretationResult:
    headline: str
    core_essence: str
    conscious_drive: str
    emotional_needs: str
    systemic_summary: str

# --- DATA: BaZi Day Masters ---
DAY_MASTERS = {
    "Jia": {
        "archetype": "The Pioneer",
        "nature": "Growth, Uprightness, Resilience",
        "keywords": ["Visionary", "Steadfast", "Protecting"]
    },
    "Yi": {
        "archetype": "The Strategist",
        "nature": "Flexibility, Networking, Survival",
        "keywords": ["Adaptable", "Persuasive", "Connected"]
    },
    "Bing": {
        "archetype": "The Illuminator",
        "nature": "Passion, Visibility, Generosity",
        "keywords": ["Charismatic", "Warm", "Open"]
    },
    "Ding": {
        "archetype": "The Guide",
        "nature": "Precision, Influence, Sacrifice",
        "keywords": ["Focused", "Inspirational", "Detail-oriented"]
    },
    "Wu": {
        "archetype": "The Mountain",
        "nature": "Stability, Trust, Stillness",
        "keywords": ["Reliable", "Solid", "Observant"]
    },
    "Ji": {
        "archetype": "The Nurturer",
        "nature": "Cultivation, Resourcefulness, Productivity",
        "keywords": ["Supportive", "Practical", "Fertile"]
    },
    "Geng": {
        "archetype": "The Reformer",
        "nature": "Justice, Action, Transformation",
        "keywords": ["Decisive", "Strong", "Efficient"]
    },
    "Xin": {
        "archetype": "The Perfectionist",
        "nature": "Refinement, Value, Precision",
        "keywords": ["Elegant", "Sharp", "Precious"]
    },
    "Ren": {
        "archetype": "The Navigator",
        "nature": "Movement, Wisdom, Power",
        "keywords": ["Dynamic", "Intelligent", "Unstoppable"]
    },
    "Gui": {
        "archetype": "The Mystic",
        "nature": "Insight, Adaptation, Pervasiveness",
        "keywords": ["Intuitive", "Subtle", "Transformative"]
    }
}

# --- DATA: Western Zodiac ---
ZODIAC_ARCHETYPES = {
    0: {"name": "Aries", "drive": "Initiative & Action", "need": "Independence & Challenge"},
    1: {"name": "Taurus", "drive": "Stability & Sensory Experience", "need": "Security & Comfort"},
    2: {"name": "Gemini", "drive": "Communication & Curiosity", "need": "Variety & Mental Stimulation"},
    3: {"name": "Cancer", "drive": "Nurturing & Protection", "need": "Emotional Safety & Belonging"},
    4: {"name": "Leo", "drive": "Expression & Leadership", "need": "Validation & Creativity"},
    5: {"name": "Virgo", "drive": "Improvement & Order", "need": "Usefulness & Clarity"},
    6: {"name": "Libra", "drive": "Harmony & Relationship", "need": "Balance & Connection"},
    7: {"name": "Scorpio", "drive": "Intensity & Transformation", "need": "Depth & Authenticity"},
    8: {"name": "Sagittarius", "drive": "Exploration & Meaning", "need": "Freedom & Truth"},
    9: {"name": "Capricorn", "drive": "Achievement & Structure", "need": "Respect & Mastery"},
    10: {"name": "Aquarius", "drive": "Innovation & Individuality", "need": "Uniqueness & Community"},
    11: {"name": "Pisces", "drive": "Compassion & Imagination", "need": "Unity & Transcendence"}
}

def interpret_onboarding(bazi_res: Any, western_res: Dict[str, Any]) -> InterpretationResult:
    """
    Synthesize a profile from BaZi (Day Master) and Western (Sun/Moon).
    """
    # 1. Extract Day Master
    # bazi_res.pillars.day is like "JiaChen"
    # We strip the branch to get Stem
    day_pillar_str = str(bazi_res.pillars.day)
    # Stems are variable length (Yi, Bing...) but we know the list.
    # However, easy hack: look at the Stem part.
    # Better: bazi_res.pillars.day is a Pillar object -> stem_index
    dm_stem_idx = bazi_res.pillars.day.stem_index
    # We need to map index to key.
    STEM_NAMES = ["Jia","Yi","Bing","Ding","Wu","Ji","Geng","Xin","Ren","Gui"]
    dm_key = STEM_NAMES[dm_stem_idx]
    
    dm_data = DAY_MASTERS[dm_key]
    
    # 2. Extract Western bodies
    sun = western_res["bodies"]["Sun"]
    moon = western_res["bodies"]["Moon"]
    
    sun_sign = ZODIAC_ARCHETYPES[sun["zodiac_sign"]]
    moon_sign = ZODIAC_ARCHETYPES[moon["zodiac_sign"]]
    
    # 3. Construct Narrative
    headline = f"{dm_data['archetype']} with {sun_sign['name']} Energy"
    
    core_essence = (
        f"Your elemental core is **{dm_key}** ({dm_data['archetype']}). "
        f"By nature, you value {dm_data['nature'].lower()}. "
        f"You operate best when you can be {dm_data['keywords'][0].lower()} and {dm_data['keywords'][1].lower()}."
    )
    
    conscious_drive = (
        f"Your conscious drive allows you to express this core through **{sun_sign['name']}**. "
        f"You are motivated by {sun_sign['drive'].lower()}."
    )
    
    emotional_needs = (
        f"Internally, your Moon in **{moon_sign['name']}** suggests you need {moon_sign['need'].lower()} to feel emotionally grounded."
    )
    
    systemic_summary = (
        f"A System combining the resilience of {dm_key} with the {sun_sign['name']} drive for {sun_sign['drive'].split('&')[0].strip().lower()}, "
        f"grounded in {moon_sign['name']} needs."
    )
    
    return InterpretationResult(
        headline=headline,
        core_essence=core_essence,
        conscious_drive=conscious_drive,
        emotional_needs=emotional_needs,
        systemic_summary=systemic_summary
    )
