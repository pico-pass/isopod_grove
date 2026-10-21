import type { WeatherInfo } from '../api/types';
import { FAMILY_LABELS } from '../utils/decor';

// 오늘의 숲 날씨 한 줄 배너. 실제 서울 날씨에서 정해지고, 편드는 계열의 번식·탐색 보너스를 알려 준다.
export function WeatherBanner({ weather, compact = false }: { weather: WeatherInfo | null; compact?: boolean }) {
  if (!weather) return null;
  if (!weather.available) {
    return (
      <div className="weather-banner unavailable" role="status">
        <span className="weather-icon">🌫️</span>
        <span>
          <b>오늘의 숲 날씨</b> · 날씨 정보를 불러오는 중이에요
        </span>
      </div>
    );
  }
  const family = weather.favoredFamily ? FAMILY_LABELS[weather.favoredFamily] : null;
  return (
    <div className={`weather-banner ${weather.type}${compact ? ' compact' : ''}`} role="status" aria-label="오늘의 숲 날씨">
      <span className="weather-icon">{weather.icon}</span>
      <div className="weather-main">
        <strong>
          오늘의 숲 날씨 · {weather.city} {weather.name}
          {weather.tempC !== undefined && <small> {weather.tempC}°C{weather.humidity ? ` · 습도 ${weather.humidity}%` : ''}</small>}
        </strong>
        {!compact && weather.flavor && <p>{weather.flavor}</p>}
        <div className="weather-effects">
          {family && (
            <span className="weather-chip on">
              {family.icon} {family.name} 계열 번식 +{weather.breedBonusPercent}%
            </span>
          )}
          {!compact &&
            (weather.effects ?? []).slice(1).map((line) => (
              <span key={line} className="weather-chip">
                {line}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
