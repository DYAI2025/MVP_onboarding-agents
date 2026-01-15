import { describe, it, expect, beforeEach } from 'vitest';
import { BaziEngineClient } from './baziEngineClient';

describe('BaziEngineClient', () => {
  let client: BaziEngineClient;

  beforeEach(() => {
    client = new BaziEngineClient('https://test-engine.fly.dev');
  });

  it('transforms birth data to engine format', () => {
    const input = {
      date: '1990-05-15',
      time: '14:30',
      tz: 'Europe/Berlin',
      lat: 52.52,
      lon: 13.405,
      place: 'Berlin, DE'
    };

    const result = client.transformBirthData(input);

    expect(result).toEqual({
      date: '1990-05-15',
      time: '14:30',
      lat: 52.52,
      lng: 13.405,
      location: 'Berlin, DE'
    });
  });
});
