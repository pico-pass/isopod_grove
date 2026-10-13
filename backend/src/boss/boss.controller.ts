import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpeciesService } from '../species/species.service';
import {
  BATTLE_ENVIRONMENTS,
  BOSS_COOLDOWN_SKIP_SECONDS_PER_DIAMOND,
  BOSS_DAILY_ATTEMPTS,
  BOSS_DIFFICULTIES,
  BOSS_EXTRA_ATTEMPT_COSTS,
  BOSS_FLOOR_COUNT,
  DUEL_ACTION_INFO,
  BOSS_PATTERNS,
  ENVIRONMENT_BONUS,
  FAMILY_BEATS,
  FAMILY_MATCHUP_BONUS,
  getBossEnvironment,
  getBossFloor,
  pickBossSpecies,
} from '../game-state/game-engine';
import { resolveFamily } from '../species/species.family';
import { EQUIPMENT_CATALOG } from '../equipment/equipment.data';

// 보스 타워 층 목록. 상대 종·기준 스탯·패턴·보상을 서버가 계산해서 내려주므로 프론트에는 계산식이 없다.
@Controller('boss')
@UseGuards(JwtAuthGuard)
export class BossController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get()
  async floors() {
    const speciesList = await this.speciesService.findAll();
    const floors = Array.from({ length: BOSS_FLOOR_COUNT }, (_, i) =>
      getBossFloor(i + 1),
    )
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .map((floor) => {
        const species = pickBossSpecies(floor, speciesList);
        return {
          floor: floor.floor,
          isBoss: floor.isBoss,
          species: species && {
            speciesId: species.speciesId,
            name: species.name,
            image: species.image,
            filter: species.filter,
            rarity: species.rarity,
            family: resolveFamily(species),
          },
          // 층마다 정해진 전투 환경(rules.environments의 id)
          environment: getBossEnvironment(floor.floor),
          stats: floor.stats,
          patterns: floor.patterns.map((p) => BOSS_PATTERNS[p]),
          rewards: {
            ...floor.rewards,
            // 화면에 보여줄 장비 후보(첫 클리어 때 이 희귀도에서 하나가 나온다)
            equipmentIds:
              floor.rewards.firstEquipmentRarity === null
                ? []
                : EQUIPMENT_CATALOG.filter(
                    (e) => e.rarity === floor.rewards.firstEquipmentRarity,
                  ).map((e) => e.equipmentId),
          },
        };
      });
    // floors의 능력치·골드 보상은 쉬움(1배) 기준이다. 난이도 배율은 difficulties로 따로 내려준다.
    return {
      dailyAttempts: BOSS_DAILY_ATTEMPTS,
      // 다이아 편의 기능: 오늘 N번째 추가 도전의 가격과, 쿨타임을 건너뛸 때 남은 초당 가격 단위
      extraAttemptCosts: BOSS_EXTRA_ATTEMPT_COSTS,
      cooldownSkipSecondsPerDiamond: BOSS_COOLDOWN_SKIP_SECONDS_PER_DIAMOND,
      // 직접 전투(매 턴 행동을 고르는 전투)에서 쓸 수 있는 행동 설명
      duelActions: DUEL_ACTION_INFO,
      // 계열 상성(각 계열이 이기는 계열)과 전투 환경 설명. 보스 타워와 야생 배틀이 같은 규칙을 쓴다.
      rules: {
        familyBeats: FAMILY_BEATS,
        matchupBonus: FAMILY_MATCHUP_BONUS,
        environmentBonus: ENVIRONMENT_BONUS,
        environments: BATTLE_ENVIRONMENTS,
      },
      difficulties: BOSS_DIFFICULTIES,
      floors,
    };
  }
}
