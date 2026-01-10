from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime

from .types import BaziInput
from .bazi import compute_bazi
from .western import compute_western_chart
from .time_utils import parse_local_iso
from .interpretation import interpret_onboarding, InterpretationResult

app = FastAPI(
    title="BaZi Engine v2 API",
    description="API for BaZi (Chinese Astrology) and Basic Western Astrology calculations.",
    version="0.4.0"
)

class BaziRequest(BaseModel):
    date: str = Field(..., description="ISO 8601 local date time (e.g. 2024-02-10T14:30:00)")
    tz: str = Field("Europe/Berlin", description="Timezone name")
    lon: float = Field(13.4050, description="Longitude in degrees")
    lat: float = Field(52.52, description="Latitude in degrees")
    standard: Literal["CIVIL", "LMT"] = "CIVIL"
    boundary: Literal["midnight", "zi"] = "midnight"
    strict: bool = True

class WesternBodyResponse(BaseModel):
    name: str = Field(..., description="Planet name")
    longitude: float = Field(..., description="0-360 degrees")
    latitude: float
    distance: float
    speed: float
    is_retrograde: bool
    zodiac_sign: int
    degree_in_sign: float

class WesternChartResponse(BaseModel):
    jd_ut: float
    house_system: str
    bodies: Dict[str, WesternBodyResponse]
    houses: Dict[str, float]
    angles: Dict[str, float]

class WesternRequest(BaseModel):
    date: str = Field(..., description="ISO 8601 local date time")
    tz: str = Field("Europe/Berlin", description="Timezone name")
    lon: float = Field(13.4050, description="Longitude in degrees")
    lat: float = Field(52.52, description="Latitude in degrees")

@app.get("/")
def read_root():
    return {"status": "ok", "service": "bazi_engine_v2", "version": "0.2.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/calculate/bazi")
def calculate_bazi_endpoint(req: BaziRequest):
    try:
        inp = BaziInput(
            birth_local=req.date,
            timezone=req.tz,
            longitude_deg=req.lon,
            latitude_deg=req.lat,
            time_standard=req.standard,
            day_boundary=req.boundary,
            strict_local_time=req.strict,
            fold=0
        )
        res = compute_bazi(inp)
        
        return {
            "input": req.dict(),
            "pillars": {
                "year": {
                    "text": str(res.pillars.year), 
                    "stem": res.pillars.year.stem_index, 
                    "branch": res.pillars.year.branch_index
                },
                "month": {
                    "text": str(res.pillars.month), 
                    "stem": res.pillars.month.stem_index, 
                    "branch": res.pillars.month.branch_index
                },
                "day": {
                    "text": str(res.pillars.day), 
                    "stem": res.pillars.day.stem_index, 
                    "branch": res.pillars.day.branch_index
                },
                "hour": {
                    "text": str(res.pillars.hour), 
                    "stem": res.pillars.hour.stem_index, 
                    "branch": res.pillars.hour.branch_index
                }
            },
            "dates": {
                "birth_local": res.birth_local_dt.isoformat(),
                "birth_utc": res.birth_utc_dt.isoformat(),
                "lichun_local": res.lichun_local_dt.isoformat()
            },
            "solar_terms_count": len(res.solar_terms_local_dt) if res.solar_terms_local_dt else 0
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/calculate/western")
def calculate_western_endpoint(req: WesternRequest):
    try:
        # Parse time similar to BaZi
        dt = parse_local_iso(req.date, req.tz, strict=True, fold=0)
        # Convert to utc for ephemeris
        from datetime import timezone
        dt_utc = dt.astimezone(timezone.utc)
        
        chart = compute_western_chart(dt_utc, req.lat, req.lon)
        return chart
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))

class InterpretationResponse(BaseModel):
    meta: Dict[str, str]
    text: Dict[str, str]

@app.post("/interpret/onboarding", response_model=InterpretationResponse)
def interpret_onboarding_endpoint(req: WesternRequest):
    """
    Onboarding Microservice: 
    Calculates both BaZi and Western charts internally and synthesizes a 
    "Systemic Portrait" for the user.
    """
    try:
        # 1. Parse Time
        dt = parse_local_iso(req.date, req.tz, strict=True, fold=0)
        from datetime import timezone
        dt_utc = dt.astimezone(timezone.utc)

        # 2. Calculate BaZi
        bazi_inp = BaziInput(
            birth_local=req.date,
            timezone=req.tz,
            longitude_deg=req.lon,
            latitude_deg=req.lat,
            strict_local_time=True,
            fold=0
        )
        bazi_res = compute_bazi(bazi_inp)

        # 3. Calculate Western
        western_res = compute_western_chart(dt_utc, req.lat, req.lon)

        # 4. Interpret
        interp = interpret_onboarding(bazi_res, western_res)

        return {
            "meta": {
                "day_master": str(bazi_res.pillars.day)[0:3], # Approx (e.g. Jia) - logic in interpretation.py is better
                "sun_sign": "", # Filled by interpretation extraction if needed, but text has it
                "moon_sign": ""
            },
            "text": {
                "headline": interp.headline,
                "core_essence": interp.core_essence,
                "conscious_drive": interp.conscious_drive,
                "emotional_needs": interp.emotional_needs,
                "systemic_summary": interp.systemic_summary
            }
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(f"Interpretation Error: {e}"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
