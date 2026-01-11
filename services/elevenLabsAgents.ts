// services/elevenLabsAgents.ts
// Pure helper to resolve ElevenLabs agent IDs from environment or fallback

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  elevenLabsId: string;
}

type AgentKey = 'levi' | 'victoria';

const PLACEHOLDER_PREFIX = 'replace-with-';

const buildConfigs = (): Record<AgentKey, AgentConfig> => ({
  levi: {
    id: 'levi',
    name: 'Levi Bazi',
    role: 'Quantum_BaZi_Protocols',
    elevenLabsId: import.meta.env.VITE_ELEVENLABS_AGENT_ID_LEVI || `${PLACEHOLDER_PREFIX}levi-agent-id`
  },
  victoria: {
    id: 'victoria',
    name: 'Victoria Celestia',
    role: 'Celestial_Relationship_Module',
    elevenLabsId: import.meta.env.VITE_ELEVENLABS_AGENT_ID_VICTORIA || `${PLACEHOLDER_PREFIX}victoria-agent-id`
  }
});

export const getAgentConfig = (agentKey: AgentKey): AgentConfig => {
  const configs = buildConfigs();
  return configs[agentKey];
};

export const getAllAgentConfigs = (): Record<AgentKey, AgentConfig> => {
  return buildConfigs();
};

export const isAgentConfigured = (agentKey: AgentKey): boolean => {
  const config = getAgentConfig(agentKey);
  return !config.elevenLabsId.startsWith(PLACEHOLDER_PREFIX);
};

export const getConfiguredAgentKeys = (): AgentKey[] => {
  return (['levi', 'victoria'] as AgentKey[]).filter(isAgentConfigured);
};
