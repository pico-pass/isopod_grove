export interface Species {
  speciesId: string;
  name: string;
  latin: string;
  rarity: number;
  price: number;
  rate: number;
  breed: number;
  image?: string;
  filter: string;
  description: string;
}

export interface Upgrade {
  upgradeId: string;
  name: string;
  icon: string;
  max: number;
  cost: number;
  factor: number;
  description: string;
}

export interface Quest {
  questId: string;
  label: string;
  target: number;
  reward: number;
}

export interface DailyProgress {
  day: string;
  feed: number;
  observe: number;
  births: number;
  claimed: string[];
}

export interface Stats {
  births: number;
  sold: number;
  earned: number;
  explored: number;
  played: number;
}

export interface LogEntry {
  at: number;
  type: string;
  text: string;
}

export interface Terrarium {
  terrariumId: string;
  name: string;
  spaceLevel: number;
  food: number;
  humidity: number;
  temperature: number;
  population: Record<string, number>;
  breeding: Record<string, number>;
}

export interface GameState {
  _id: string;
  userId: string;
  coins: number;
  pending: number;
  xp: number;
  terrariums: Terrarium[];
  discovered: string[];
  upgrades: Record<string, number>;
  daily: DailyProgress;
  stats: Stats;
  cooldowns: Record<string, number>;
  logs: LogEntry[];
  paused: boolean;
  sound: boolean;
}

export type CareAction = 'feed' | 'mist' | 'climate';

export interface ActionResult {
  gameState: GameState;
  message?: string;
  coins?: number;
  species?: Species;
  terrariumId?: string;
  isNew?: boolean;
  births?: number;
  earned?: number;
}
