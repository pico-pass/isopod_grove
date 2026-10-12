import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SURVIVAL_BUFFS,
  SURVIVAL_CLEAR_HEAL_RATE,
  SURVIVAL_DAILY_ATTEMPTS,
  SURVIVAL_ELITE_EVERY,
  SURVIVAL_EXTRA_ATTEMPT_COSTS,
  SURVIVAL_FIRST_REACH_EQUIPMENT,
  SURVIVAL_GOLD_BASE,
  SURVIVAL_GOLD_PER_STAGE,
  SURVIVAL_MAX_STAGE,
  SURVIVAL_MILESTONE_DIAMONDS,
  SURVIVAL_MILESTONE_EVERY,
  SURVIVAL_REVIVE_COSTS,
  SURVIVAL_REVIVE_HP_RATE,
  SURVIVAL_SPECIES_XP_BASE,
  SURVIVAL_SPECIES_XP_PER_STAGE,
} from '../game-state/game-engine';

// 서바이벌 규칙 안내(화면에 보여줄 값). 규칙 숫자를 프론트에 따로 두지 않으려고 서버가 내려준다.
@Controller('survival')
@UseGuards(JwtAuthGuard)
export class SurvivalInfoController {
  @Get()
  info() {
    return {
      dailyAttempts: SURVIVAL_DAILY_ATTEMPTS,
      maxStage: SURVIVAL_MAX_STAGE,
      eliteEvery: SURVIVAL_ELITE_EVERY,
      healRate: SURVIVAL_CLEAR_HEAL_RATE,
      buffs: SURVIVAL_BUFFS,
      // 다이아 편의 기능: 오늘 N번째 추가 입장 가격, 한 런에서 N번째 부활 가격과 부활 시 회복 비율
      extraAttemptCosts: SURVIVAL_EXTRA_ATTEMPT_COSTS,
      reviveCosts: SURVIVAL_REVIVE_COSTS,
      reviveHpRate: SURVIVAL_REVIVE_HP_RATE,
      rewards: {
        goldBase: SURVIVAL_GOLD_BASE,
        goldPerStage: SURVIVAL_GOLD_PER_STAGE,
        xpBase: SURVIVAL_SPECIES_XP_BASE,
        xpPerStage: SURVIVAL_SPECIES_XP_PER_STAGE,
        milestoneEvery: SURVIVAL_MILESTONE_EVERY,
        milestoneDiamonds: SURVIVAL_MILESTONE_DIAMONDS,
        firstReach: Object.entries(SURVIVAL_FIRST_REACH_EQUIPMENT).map(([stage, rarity]) => ({
          stage: Number(stage),
          rarity,
        })),
      },
    };
  }
}
