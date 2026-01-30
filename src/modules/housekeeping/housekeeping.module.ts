import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';
import { UserDoc } from '@entities/user_docs.entity';
import { User } from '@entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { I18nService } from 'src/common/services/i18n.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([UserDoc, User]),
		ConfigModule,
	],
	controllers: [HousekeepingController],
	providers: [HousekeepingService, I18nService],
	exports: [HousekeepingService],
})
export class HousekeepingModule {} 