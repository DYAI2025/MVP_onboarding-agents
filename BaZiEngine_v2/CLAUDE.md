# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BaZi Engine v0.2 is an astronomical calculation engine for Chinese astrology (Four Pillars of Destiny / BaZi 八字). It calculates Year, Month, Day, and Hour pillars using precise astronomical solar-term boundaries rather than calendar dates, ensuring accuracy according to traditional Chinese astrological principles.

**Core differentiator**: Uses Swiss Ephemeris for real-time astronomical calculations of solar longitude positions to determine exact solar term crossings, making it deterministic and astronomically accurate.

**Repository structure**: The actual Python package is located in the `bazi_engine_v0_2/` subdirectory. All commands below must be run from within that directory unless otherwise specified.

## Directory Structure

```
BaZiEngine_v2/                      # Repository root
└── bazi_engine_v0_2/              # Python package directory (work here)
    ├── bazi_engine/               # Main package
    │   ├── bazi.py               # Core Four Pillars calculation logic
    │   ├── types.py              # Data structures (Pillar, BaziInput, BaziResult)
    │   ├── constants.py          # Stems/Branches definitions
    │   ├── time_utils.py         # Time parsing and timezone handling
    │   ├── ephemeris.py          # Swiss Ephemeris backend integration
    │   ├── jieqi.py              # Solar term (Jie Qi) calculations
    │   ├── cli.py                # Command-line interface
    │   ├── app.py                # FastAPI web application
    │   ├── interpretation.py     # BaZi interpretation logic
    │   └── western.py            # Western astrology (supplementary)
    ├── tests/
    │   ├── test_golden_vectors.py  # Known-correct test cases
    │   ├── test_golden.py          # Legacy golden tests
    │   └── test_invariants.py      # Property-based tests
    ├── pyproject.toml            # Package configuration
    ├── Dockerfile                # Container build
    └── README.md                 # Package documentation
```

## Development Commands

**IMPORTANT**: Change to the `bazi_engine_v0_2` directory before running these commands:
```bash
cd bazi_engine_v0_2
```

### Installation
```bash
# Install package in development mode
pip install -e .

# Install with development dependencies (includes pytest)
pip install -e ".[dev]"

# Install with optional Skyfield backend (stub only in v0.2)
pip install -e ".[skyfield]"
```

### Running the CLI
```bash
# Basic usage
python -m bazi_engine.cli 2024-02-10T14:30:00 --tz Europe/Berlin --lon 13.405 --lat 52.52

# With JSON output
python -m bazi_engine.cli 2024-02-10T14:30:00 --tz Europe/Berlin --lon 13.405 --lat 52.52 --json

# With LMT (Local Mean Time) instead of civil time
python -m bazi_engine.cli 2024-02-10T14:30:00 --tz Europe/Berlin --lon 13.405 --lat 52.52 --standard LMT

# With Zi hour as day boundary (instead of midnight)
python -m bazi_engine.cli 2024-02-10T14:30:00 --tz Europe/Berlin --lon 13.405 --lat 52.52 --boundary zi
```

### Running the Web API
```bash
# Start FastAPI server
uvicorn bazi_engine.app:app --host 0.0.0.0 --port 8080

# Or using module approach
python -m bazi_engine.app

# API endpoints:
# GET /                      - Health check
# POST /calculate/bazi       - Calculate BaZi chart
# POST /calculate/western    - Calculate Western chart
```

### Testing
```bash
# Run all tests
pytest -q

# Run specific test file
pytest tests/test_golden_vectors.py

# Run with verbose output
pytest -v

# Run specific test case
pytest tests/test_golden_vectors.py::test_golden_vectors_v04
```

### Docker
```bash
# Build image (from bazi_engine_v0_2 directory)
docker build -t bazi_engine .

# Run container
docker run -p 8080:8080 bazi_engine
```

## Core Calculation Logic

### Astronomical Boundaries
The engine uses precise astronomical calculations to determine pillar boundaries:

1. **Year Pillar**: Boundary at LiChun (Start of Spring) when Sun reaches 315° apparent longitude
2. **Month Pillar**: Boundaries at 12 Jie solar terms (315° + 30°×k, where k=0..11)
3. **Day Pillar**: Based on Julian Day Number (JDN) converted to sexagenary cycle
4. **Hour Pillar**: 2-hour periods based on traditional Chinese hours (Earthly Branches)

### Key Algorithms

**Solar Term Calculation** (`jieqi.py`):
- Uses `solcross_ut()` from Swiss Ephemeris to find exact UTC moment when Sun crosses target longitude
- Computes all 24 solar terms for a year window for diagnostics
- Handles timezone conversion and DST edge cases

**Year/Month Determination** (`bazi.py:compute_bazi`):
- Finds LiChun (315°) for the calendar year
- If birth is before LiChun, uses previous year's stem-branch
- Computes 12 month boundaries starting from LiChun
- Month pillar derived using traditional formula from year stem

**Day Pillar** (`bazi.py:sexagenary_day_index_from_date`):
- Converts Gregorian date to Julian Day Number using standard formula
- Applies offset to align with sexagenary cycle (default anchor: 1949-10-01 = JiaZi)
- Supports custom day anchors for verification (v0.4 feature)

**Hour Pillar** (`bazi.py:hour_pillar_from_day_stem`):
- Divides 24-hour day into 12 two-hour periods
- Hour stem derived from day stem using traditional formula
- Supports configurable day boundary (midnight vs Zi hour)

### Time Handling
- Parses local ISO 8601 timestamps with IANA timezone names
- Optional strict mode validates DST ambiguous/nonexistent times
- Supports both CIVIL time and Local Mean Time (LMT) based on longitude
- Converts to UTC for ephemeris calculations, then to chart-local time

## Data Structures

**Core types** (all immutable dataclasses):
- `Pillar`: stem_index (0-9), branch_index (0-11)
- `FourPillars`: year, month, day, hour (each is a Pillar)
- `BaziInput`: Configuration including birth time, location, calculation options
- `BaziResult`: Complete calculation result with pillars and diagnostic data

**Configuration options** (`BaziInput`):
- `time_standard`: "CIVIL" (default) or "LMT"
- `day_boundary`: "midnight" (default) or "zi"
- `strict_local_time`: Validate DST edge cases (default: True)
- `day_anchor_date_iso` / `day_anchor_pillar_idx`: Custom day offset verification
- `ephe_path`: Custom Swiss Ephemeris data file path

## Testing Philosophy

**Test-Driven Development**:
- Golden vectors: Known-correct results from authoritative sources
- Invariant tests: Properties that must always hold (e.g., pillars in valid ranges)
- Edge cases: DST boundaries, high latitudes, pre-LiChun dates, custom anchors

**Test file locations**: Always in `tests/` directory (never in root)

## Dependencies

**Core**:
- `pyswisseph>=2.10.3` - Swiss Ephemeris astronomical calculations
- `fastapi>=0.109.0` - Web API framework
- `uvicorn[standard]>=0.27.0` - ASGI server

**Development**:
- `pytest>=8.0` - Testing framework

**Optional**:
- `skyfield>=1.45` - Alternative ephemeris backend (stub only in v0.2)

## Code Style

- Python 3.10+ with type hints throughout
- Immutable dataclasses for data structures
- Functional approach to calculations (pure functions where possible)
- Explicit error handling with descriptive exceptions
- Module-level functions for core logic (not class-based)

## Working with Ephemeris Files

The engine requires Swiss Ephemeris data files for high precision:
- Default location: System-dependent (see pyswisseph docs)
- Docker setup downloads files to `/usr/local/share/swisseph`
- Can override with `ephe_path` parameter in `BaziInput`
- Files needed: `sepl_18.se1`, `semo_18.se1`, `seas_18.se1` (1800-2400 AD)
