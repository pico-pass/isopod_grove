import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpeciesModule } from './species/species.module';
import { UpgradesModule } from './upgrades/upgrades.module';
import { QuestsModule } from './quests/quests.module';
import { UsersModule } from './users/users.module';
import { GameStateModule } from './game-state/game-state.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    SpeciesModule,
    UpgradesModule,
    QuestsModule,
    UsersModule,
    GameStateModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
