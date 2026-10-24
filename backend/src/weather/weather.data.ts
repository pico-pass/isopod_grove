import type { SpeciesFamily } from '../species/species.family';

// "오늘의 숲 날씨": 실제 서울 날씨를 게임 속 숲 날씨로 바꾼다. 모든 유저에게 같은 날씨가 적용되고, 효과는 전부 이득 쪽이라
// (벌칙이 없어서) 자리를 오래 비운 유저가 손해 보지 않는다.
//   - 그 날씨가 편드는 계열 종의 번식 진행이 WEATHER_BREED_BONUS_PERCENT% 빨라진다(꾸미기 장식·번식 촉진 부스트와 곱해진다).
//   - 숲 탐색·원정에서 같은 등급 안에 편드는 계열 종이 나올 가능성이 WEATHER_EXPLORE_WEIGHT배가 된다(다른 종이 못 나오게 되지는 않는다).
//   - 비가 오면 사육장 습도가 줄어드는 속도가 절반이 된다.
export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'heat' | 'cold';

export const WEATHER_CITY = '서울';
export const WEATHER_BREED_BONUS_PERCENT = 10;
export const WEATHER_EXPLORE_WEIGHT = 2;
export const WEATHER_RAIN_HUMIDITY_DECAY_MULT = 0.5;
export const WEATHER_STALE_MS = 3 * 3_600_000; // 마지막 관측이 이보다 오래됐으면 날씨 정보가 없는 것으로 본다(효과도 없다)
export const HEAT_TEMP_C = 30; // 이 기온 이상이면 폭염(비·눈이 오는 날은 제외)
export const COLD_TEMP_C = -3; // 이 기온 이하이면 한파

export interface WeatherKind {
  type: WeatherType;
  name: string;
  icon: string;
  family: SpeciesFamily; // 이 날씨가 편드는 계열
  flavor: string; // 숲의 분위기 한 줄
}

export const WEATHER_KINDS: Record<WeatherType, WeatherKind> = {
  clear: { type: 'clear', name: '맑음', icon: '☀️', family: 'fire', flavor: '햇살이 가득한 숲이에요.' },
  cloudy: { type: 'cloudy', name: '흐림', icon: '☁️', family: 'frost', flavor: '구름이 낮게 깔려 서늘해요.' },
  rain: { type: 'rain', name: '비', icon: '🌧️', family: 'forest', flavor: '숲이 촉촉하게 젖었어요.' },
  storm: { type: 'storm', name: '뇌우', icon: '⛈️', family: 'fire', flavor: '번개가 번쩍이는 숲이에요.' },
  snow: { type: 'snow', name: '눈', icon: '❄️', family: 'frost', flavor: '하얗게 눈이 내려요.' },
  heat: { type: 'heat', name: '폭염', icon: '🔥', family: 'fire', flavor: '숲이 뜨겁게 달아올랐어요.' },
  cold: { type: 'cold', name: '한파', icon: '🥶', family: 'frost', flavor: '숲이 꽁꽁 얼어붙었어요.' },
};

export const WEATHER_TYPES = Object.keys(WEATHER_KINDS) as WeatherType[];

const FAMILY_NAMES: Record<SpeciesFamily, string> = { fire: '불꽃', forest: '숲', frost: '서리' };

// WMO 날씨 코드(Open-Meteo가 준다)와 기온으로 숲 날씨를 정한다. 우선순위: 뇌우 > 눈 > 비 > 폭염 > 한파 > 흐림 > 맑음.
export function classifyWeather(code: number, tempC: number): WeatherType {
  if (code >= 95 && code <= 99) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (tempC >= HEAT_TEMP_C) return 'heat';
  if (tempC <= COLD_TEMP_C) return 'cold';
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
  return 'clear';
}

export interface WeatherEffects {
  favored: SpeciesFamily | null; // 날씨 정보가 없으면 null
  breedFactor: number; // 편드는 계열 종의 번식 진행 배율
  humidityDecayMult: number; // 사육장 습도가 줄어드는 속도 배율
}

export const NO_WEATHER_EFFECTS: WeatherEffects = { favored: null, breedFactor: 1, humidityDecayMult: 1 };

export function getWeatherEffects(type: WeatherType | null | undefined): WeatherEffects {
  if (!type || !WEATHER_KINDS[type]) return NO_WEATHER_EFFECTS;
  return {
    favored: WEATHER_KINDS[type].family,
    breedFactor: 1 + WEATHER_BREED_BONUS_PERCENT / 100,
    humidityDecayMult: type === 'rain' ? WEATHER_RAIN_HUMIDITY_DECAY_MULT : 1,
  };
}

// 화면에 보여 줄 효과 설명
export function describeWeatherEffects(type: WeatherType): string[] {
  const family = FAMILY_NAMES[WEATHER_KINDS[type].family];
  const lines = [
    `${family} 계열 번식 +${WEATHER_BREED_BONUS_PERCENT}%`,
    `숲 탐색·원정에서 ${family} 계열 종을 만날 확률이 ${WEATHER_EXPLORE_WEIGHT}배`,
  ];
  if (type === 'rain') lines.push('사육장 습도가 천천히 줄어요');
  return lines;
}

// 같은 희귀도 안에서 편드는 계열 종에 가중치를 줘서 하나 고른다. random은 [0, 1). 편드는 계열이 없으면 균등하게 고른다.
export function pickWeightedByFamily<T extends { speciesId: string; family?: string }>(
  pool: readonly T[],
  random: number,
  favored: SpeciesFamily | null,
  familyOf: (s: T) => SpeciesFamily,
  weight = WEATHER_EXPLORE_WEIGHT,
): T {
  return pickWeightedByFamilyWeights(pool, random, favored ? { [favored]: weight } : {}, familyOf);
}

// 계열마다 다른 가중치(없으면 1)로 하나 고른다. 날씨와 계절 이벤트가 겹쳐 두 계열 이상을 편들 때 쓴다. 가중치가 하나도 없으면 균등하다.
export type FamilyWeights = Partial<Record<SpeciesFamily, number>>;

export function pickWeightedByFamilyWeights<T extends { speciesId: string; family?: string }>(
  pool: readonly T[],
  random: number,
  familyWeights: FamilyWeights,
  familyOf: (s: T) => SpeciesFamily,
): T {
  if (pool.length === 0) throw new Error('고를 종이 없어요.');
  if (Object.keys(familyWeights).length === 0) return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
  const weights = pool.map((s) => familyWeights[familyOf(s)] ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
