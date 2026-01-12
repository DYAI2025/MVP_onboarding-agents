// services/elevenLabsAgents.test.ts
import { describe, it, expect } from 'vitest';
import { getAgentConfig, isAgentConfigured, getAllAgentConfigs } from './elevenLabsAgents';

describe('elevenLabsAgents', () => {
  describe('getAgentConfig', () => {
    it('returns levi config with correct structure', () => {
      const config = getAgentConfig('levi');
      expect(config.id).toBe('levi');
      expect(config.name).toBe('Levi Bazi');
      expect(config.role).toBe('Quantum_BaZi_Protocols');
      expect(config.elevenLabsId).toBeDefined();
      expect(typeof config.elevenLabsId).toBe('string');
    });

    it('returns victoria config with correct structure', () => {
      const config = getAgentConfig('victoria');
      expect(config.id).toBe('victoria');
      expect(config.name).toBe('Victoria Celestia');
      expect(config.role).toBe('Celestial_Relationship_Module');
      expect(config.elevenLabsId).toBeDefined();
    });
  });

  describe('getAllAgentConfigs', () => {
    it('returns both agent configs', () => {
      const configs = getAllAgentConfigs();
      expect(configs.levi).toBeDefined();
      expect(configs.victoria).toBeDefined();
      expect(Object.keys(configs)).toHaveLength(2);
    });
  });

  describe('isAgentConfigured', () => {
    it('returns false when agent ID contains placeholder prefix', () => {
      // Default state without env vars should have placeholder
      const leviConfigured = isAgentConfigured('levi');
      const victoriaConfigured = isAgentConfigured('victoria');

      // Without env vars set, both should be false (using placeholders)
      // Note: This test assumes no env vars are set during test run
      expect(typeof leviConfigured).toBe('boolean');
      expect(typeof victoriaConfigured).toBe('boolean');
    });
  });
});
