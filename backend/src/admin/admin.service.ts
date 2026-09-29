import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GameState,
  GameStateDocument,
} from '../game-state/schemas/game-state.schema';
import { UsersService } from '../users/users.service';
import { SpeciesService } from '../species/species.service';
import { UpgradesService } from '../upgrades/upgrades.service';
import { QuestsService } from '../quests/quests.service';
import { AchievementsService } from '../achievements/achievements.service';

export interface EconomyTotals {
  coins: number;
  diamonds: number;
  explorationTickets: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(GameState.name)
    private gameStateModel: Model<GameStateDocument>,
    private readonly usersService: UsersService,
    private readonly speciesService: SpeciesService,
    private readonly upgradesService: UpgradesService,
    private readonly questsService: QuestsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async getStats() {
    const [
      userCount,
      gameStateCount,
      speciesList,
      upgradeList,
      questList,
      achievementList,
      economy,
    ] = await Promise.all([
      this.usersService.count(),
      this.gameStateModel.countDocuments().exec(),
      this.speciesService.findAll(),
      this.upgradesService.findAll(),
      this.questsService.findAll(),
      this.achievementsService.findAll(),
      this.getEconomyTotals(),
    ]);

    return {
      content: {
        species: speciesList.length,
        upgrades: upgradeList.length,
        quests: questList.length,
        achievements: achievementList.length,
      },
      players: {
        users: userCount,
        gameStates: gameStateCount,
      },
      economy,
      server: {
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
    };
  }

  private async getEconomyTotals(): Promise<EconomyTotals> {
    const [row] = await this.gameStateModel.aggregate<
      EconomyTotals & { _id: null }
    >([
      {
        $group: {
          _id: null,
          coins: { $sum: '$coins' },
          diamonds: { $sum: '$diamonds' },
          explorationTickets: { $sum: '$explorationTickets' },
        },
      },
    ]);
    if (!row) return { coins: 0, diamonds: 0, explorationTickets: 0 };
    const { coins, diamonds, explorationTickets } = row;
    return { coins, diamonds, explorationTickets };
  }
}
