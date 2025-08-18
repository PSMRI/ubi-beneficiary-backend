import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';
import { UserDoc } from '@entities/user_docs.entity';
import { User } from '@entities/user.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
	imports: [
		TypeOrmModule.forFeature([UserDoc, User]),
		ConfigModule,
	],
	controllers: [HousekeepingController],
	providers: [HousekeepingService],
	exports: [HousekeepingService],
})
export class HousekeepingModule {} 