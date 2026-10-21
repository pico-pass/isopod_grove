import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeatherService } from './weather.service';
import {
  WEATHER_BREED_BONUS_PERCENT,
  WEATHER_CITY,
  WEATHER_EXPLORE_WEIGHT,
  WEATHER_KINDS,
  describeWeatherEffects,
} from './weather.data';

@Controller('weather')
@UseGuards(JwtAuthGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  // 오늘의 숲 날씨. 날씨 정보가 없으면(아직 못 읽었거나 3시간 넘게 갱신 실패) available: false이고 효과도 없다.
  @Get()
  current() {
    const sample = this.weatherService.current();
    if (!sample) return { available: false, city: WEATHER_CITY };
    const kind = WEATHER_KINDS[sample.type];
    return {
      available: true,
      city: WEATHER_CITY,
      type: sample.type,
      name: kind.name,
      icon: kind.icon,
      flavor: kind.flavor,
      tempC: Math.round(sample.tempC * 10) / 10,
      humidity: Math.round(sample.humidity),
      observedAt: sample.at,
      favoredFamily: kind.family,
      breedBonusPercent: WEATHER_BREED_BONUS_PERCENT,
      exploreWeight: WEATHER_EXPLORE_WEIGHT,
      effects: describeWeatherEffects(sample.type),
    };
  }
}
