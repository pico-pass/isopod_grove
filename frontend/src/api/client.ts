import type { ActionResult, CareAction, GameState, Quest, Species, Upgrade } from './types';
import { authStorage } from '../auth/authStorage';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface AuthUser {
  _id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = authStorage.getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    authStorage.clearToken();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `요청에 실패했어요. (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const api = {
  googleLoginUrl: () => `${BASE_URL}/auth/google`,
  me: () => request<AuthUser>('/auth/me'),

  getSpecies: () => request<Species[]>('/species'),
  getUpgrades: () => request<Upgrade[]>('/upgrades'),
  getQuests: () => request<Quest[]>('/quests'),

  getGameState: () => request<GameState>('/game-state'),

  advance: (seconds: number) => post<ActionResult>('/game-state/advance', { seconds }),
  care: (action: CareAction, terrariumId?: string) =>
    post<ActionResult>('/game-state/care', { action, terrariumId }),
  observe: (speciesId: string) => post<ActionResult>('/game-state/observe', { speciesId }),
  collect: () => post<ActionResult>('/game-state/collect'),
  explore: (terrariumId?: string) => post<ActionResult>('/game-state/explore', { terrariumId }),
  sell: (speciesId: string, quantity: number, terrariumId?: string) =>
    post<ActionResult>('/game-state/sell', { speciesId, quantity, terrariumId }),
  upgrade: (upgradeId: string, terrariumId?: string) =>
    post<ActionResult>('/game-state/upgrade', { upgradeId, terrariumId }),
  addTerrarium: (name?: string) => post<ActionResult>('/game-state/terrariums', { name }),
  moveSpecies: (speciesId: string, fromTerrariumId: string, toTerrariumId: string) =>
    post<ActionResult>('/game-state/move', { speciesId, fromTerrariumId, toTerrariumId }),
  claim: (questId: string) => post<ActionResult>('/game-state/claim', { questId }),
};
