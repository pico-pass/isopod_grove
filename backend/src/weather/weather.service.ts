import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeatherLog, WeatherLogDocument } from './schemas/weather-log.schema';
import { WEATHER_KINDS, WEATHER_STALE_MS, classifyWeather, type WeatherType } from './weather.data';

// 서울 좌표. Open-Meteo는 키가 필요 없는 무료 날씨 서비스다.
const SEOUL_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780' +
  '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Asia%2FSeoul';
export const WEATHER_REFRESH_MS = 30 * 60_000; // 30분마다 새로 읽는다
const FETCH_TIMEOUT_MS = 8000;
export const WEATHER_HISTORY_MS = 3 * 24 * 3_600_000; // 3일 치를 보관한다

export interface WeatherSample {
  at: number;
  type: WeatherType;
  code: number;
  tempC: number;
  humidity: number;
  precipitation: number;
}

@Injectable()
export class WeatherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeatherService.name);
  // 테스트에서는 이걸 갈아 끼워서 네트워크 없이 검증한다.
  fetchImpl: (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> = (url, init) =>
    fetch(url, init);
  private history: WeatherSample[] = []; // 관측 시각 오름차순
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectModel(WeatherLog.name)
    private readonly logModel?: Model<WeatherLogDocument>,
  ) {}

  async onModuleInit() {
    await this.loadHistory();
    void this.refresh(); // 기다리지 않는다(서버가 켜지는 것을 막지 않는다)
    this.timer = setInterval(() => void this.refresh(), WEATHER_REFRESH_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // 저장된 최근 관측을 읽어 온다(서버를 다시 켜도 직전 날씨를 바로 알 수 있게).
  async loadHistory(now = Date.now()): Promise<number> {
    if (!this.logModel) return 0;
    try {
      const docs = await this.logModel
        .find({ at: { $gte: now - WEATHER_HISTORY_MS } })
        .sort({ at: 1 })
        .lean<WeatherSample[]>();
      this.history = docs
        .filter((d) => d.type in WEATHER_KINDS)
        .map((d) => ({ at: d.at, type: d.type as WeatherType, code: d.code, tempC: d.tempC, humidity: d.humidity ?? 0, precipitation: d.precipitation ?? 0 }));
    } catch (e) {
      this.logger.warn(`날씨 기록을 읽지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    }
    return this.history.length;
  }

  // 지금 날씨를 읽어 기록한다. 실패하면(네트워크·이상한 응답) 직전 기록을 그대로 두고 null을 돌려준다.
  async refresh(now = Date.now()): Promise<WeatherSample | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let res;
      try {
        res = await this.fetchImpl(SEOUL_URL, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sample = this.parse(await res.json(), now);
      if (!sample) throw new Error('날씨 응답을 읽을 수 없어요');
      this.record(sample);
      if (this.logModel) {
        await this.logModel
          .create({ ...sample, expireAt: new Date(sample.at + WEATHER_HISTORY_MS) })
          .catch((e: unknown) => this.logger.warn(`날씨 기록 저장 실패: ${e instanceof Error ? e.message : String(e)}`));
      }
      return sample;
    } catch (e) {
      this.logger.warn(`날씨를 불러오지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  // Open-Meteo 응답에서 필요한 값만 꺼낸다. 숫자가 아니거나 없으면 null.
  parse(body: unknown, now: number): WeatherSample | null {
    const cur = (body as { current?: Record<string, unknown> } | null)?.current;
    if (!cur) return null;
    const code = Number(cur.weather_code);
    const tempC = Number(cur.temperature_2m);
    if (cur.weather_code == null || cur.temperature_2m == null || !Number.isFinite(code) || !Number.isFinite(tempC)) return null;
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    return { at: now, type: classifyWeather(code, tempC), code, tempC, humidity: num(cur.relative_humidity_2m), precipitation: num(cur.precipitation) };
  }

  private record(sample: WeatherSample) {
    this.history.push(sample);
    this.history.sort((a, b) => a.at - b.at);
    const cutoff = sample.at - WEATHER_HISTORY_MS;
    while (this.history.length > 0 && this.history[0].at < cutoff) this.history.shift();
  }

  // 그 시각의 관측(그보다 앞선 가장 가까운 기록). 3시간 넘게 오래된 기록이거나 기록이 없으면 null.
  sampleAt(ms: number): WeatherSample | null {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const s = this.history[i];
      if (s.at <= ms) return ms - s.at <= WEATHER_STALE_MS ? s : null;
    }
    return null;
  }

  typeAt(ms: number): WeatherType | null {
    return this.sampleAt(ms)?.type ?? null;
  }

  current(now = Date.now()): WeatherSample | null {
    return this.sampleAt(now);
  }
}
