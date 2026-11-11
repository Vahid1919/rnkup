export const AGENTS = [
  'Astra',
  'Breach',
  'Brimstone',
  'Chamber',
  'Clove',
  'Cypher',
  'Deadlock',
  'Fade',
  'Gekko',
  'Harbor',
  'Hush',
  'Iso',
  'Jett',
  'KAYO',
  'Killjoy',
  'Miks',
  'Neon',
  'Omen',
  'Phoenix',
  'Raze',
  'Reyna',
  'Sage',
  'Skye',
  'Sova',
  'Tejo',
  'Veto',
  'Viper',
  'Vyse',
  'Waylay',
  'Yoru',
] as const;

export type AgentName = (typeof AGENTS)[number];

const PNG_ARTWORK_AGENTS = new Set<AgentName>([
  'Skye',
  'Sova',
  'Tejo',
  'Veto',
  'Viper',
  'Vyse',
  'Waylay',
  'Yoru',
]);

export function getAgentArtworkName(agentName: string): AgentName | null {
  const artworkName = agentName === 'KAY/O' ? 'KAYO' : agentName;
  return AGENTS.includes(artworkName as AgentName)
    ? (artworkName as AgentName)
    : null;
}

export function agentImageUrl(name: AgentName): string {
  const extension = PNG_ARTWORK_AGENTS.has(name) ? 'png' : 'webp';
  return `/images/agents/${name}_Artwork_Full.${extension}`;
}

export type AgentRole = 'Duelist' | 'Initiator' | 'Controller' | 'Sentinel';

const AGENT_ROLES: Record<string, AgentRole> = {
  Astra: 'Controller',
  Breach: 'Initiator',
  Brimstone: 'Controller',
  Chamber: 'Sentinel',
  Clove: 'Controller',
  Cypher: 'Sentinel',
  Deadlock: 'Sentinel',
  Fade: 'Initiator',
  Gekko: 'Initiator',
  Harbor: 'Controller',
  Hush: 'Duelist',
  Iso: 'Duelist',
  Jett: 'Duelist',
  'KAY/O': 'Initiator',
  KAYO: 'Initiator',
  Killjoy: 'Sentinel',
  Miks: 'Controller',
  Neon: 'Duelist',
  Omen: 'Controller',
  Phoenix: 'Duelist',
  Raze: 'Duelist',
  Reyna: 'Duelist',
  Sage: 'Sentinel',
  Skye: 'Initiator',
  Sova: 'Initiator',
  Tejo: 'Initiator',
  Veto: 'Sentinel',
  Viper: 'Controller',
  Vyse: 'Sentinel',
  Waylay: 'Duelist',
  Yoru: 'Duelist',
};

/** Returns null for agents released after this table was last updated. */
export function getAgentRole(agentName: string): AgentRole | null {
  return AGENT_ROLES[agentName] ?? null;
}

const ASSET_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Small face portrait hosted by valorant-api.com, keyed by the agent ID. */
export function agentPortraitUrl(agentId: string | null): string | null {
  return agentId !== null && ASSET_ID_PATTERN.test(agentId)
    ? `https://media.valorant-api.com/agents/${agentId.toLowerCase()}/killfeedportrait.png`
    : null;
}

/** Wide map banner hosted by valorant-api.com, keyed by the map ID. */
export function mapBannerUrl(mapId: string | null): string | null {
  return mapId !== null && ASSET_ID_PATTERN.test(mapId)
    ? `https://media.valorant-api.com/maps/${mapId.toLowerCase()}/listviewicon.png`
    : null;
}
