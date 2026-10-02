import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpeciesService } from '../species/species.service';
import {
  BOSS_DAILY_ATTEMPTS,
  BOSS_FLOOR_COUNT,
  BOSS_PATTERNS,
  getBossFloor,
  pickBossSpecies,
} from '../game-state/game-engine';
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
          },
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
    return { dailyAttempts: BOSS_DAILY_ATTEMPTS, floors };
  }
}
