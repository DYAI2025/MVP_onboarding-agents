import { GatewayError } from './errors';

export interface BirthInput {
  date: string;
  time: string;
  tz: string;
  lat: number;
  lon: number;
  place: string;
}

export interface EnginePayload {
  date: string;
  time: string;
  lat: number;
  lng: number;
  location: string;
}

export class BaziEngineClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string, timeoutMs: number = 8000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  transformBirthData(input: BirthInput): EnginePayload {
    return {
      date: input.date,
      time: input.time,
      lat: input.lat,
      lng: input.lon,
      location: input.place
    };
  }

  async calculateBazi(payload: EnginePayload): Promise<unknown> {
    return this.post('/calculate/bazi', payload);
  }

  async calculateWestern(payload: EnginePayload): Promise<unknown> {
    return this.post('/calculate/western', payload);
  }

  private async post(endpoint: string, payload: unknown): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        throw new GatewayError(
          'ENGINE_ERROR',
          `BaziEngine returned ${response.status}`,
          502
        );
      }

      return response.json();
    } catch (error: unknown) {
      if (error instanceof GatewayError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayError('ENGINE_TIMEOUT', 'BaziEngine request timed out', 504);
      }
      throw new GatewayError('ENGINE_UNAVAILABLE', 'BaziEngine unreachable', 503);
    }
  }
}

// Default instance
export const baziEngine = new BaziEngineClient(
  process.env.BAZI_ENGINE_URL || 'https://baziengine-v2.fly.dev'
);
