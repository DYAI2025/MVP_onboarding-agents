// services/config.test.ts
import { describe, it, expect } from 'vitest';
import {
  BAZI_ENGINE_BASE_URL,
  REMOTE_SYMBOL_ENDPOINT,
  REMOTE_TRANSITS_ENDPOINT,
  LOCAL_PROXY_URL
} from '../src/config';

describe('config endpoints', () => {
  describe('BAZI_ENGINE_BASE_URL', () => {
    it('is defined and is a string', () => {
      expect(BAZI_ENGINE_BASE_URL).toBeDefined();
      expect(typeof BAZI_ENGINE_BASE_URL).toBe('string');
    });

    it('has no trailing slash', () => {
      expect(BAZI_ENGINE_BASE_URL).not.toMatch(/\/$/);
    });

    it('starts with https://', () => {
      expect(BAZI_ENGINE_BASE_URL).toMatch(/^https:\/\//);
    });
  });

  describe('REMOTE_SYMBOL_ENDPOINT', () => {
    it('ends with /api/symbol', () => {
      expect(REMOTE_SYMBOL_ENDPOINT).toMatch(/\/api\/symbol$/);
    });

    it('does not have double /api/ paths', () => {
      expect(REMOTE_SYMBOL_ENDPOINT).not.toMatch(/\/api\/.*\/api\//);
    });

    it('is constructed from base URL', () => {
      expect(REMOTE_SYMBOL_ENDPOINT).toBe(`${BAZI_ENGINE_BASE_URL}/api/symbol`);
    });
  });

  describe('REMOTE_TRANSITS_ENDPOINT', () => {
    it('ends with /api/transits', () => {
      expect(REMOTE_TRANSITS_ENDPOINT).toMatch(/\/api\/transits$/);
    });

    it('is constructed from base URL', () => {
      expect(REMOTE_TRANSITS_ENDPOINT).toBe(`${BAZI_ENGINE_BASE_URL}/api/transits`);
    });
  });

  describe('LOCAL_PROXY_URL', () => {
    it('is relative path /api/symbol', () => {
      expect(LOCAL_PROXY_URL).toBe('/api/symbol');
    });
  });
});
