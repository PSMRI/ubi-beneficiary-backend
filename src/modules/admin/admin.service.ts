import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FieldMappingDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

@Injectable()
export class AdminService {
	constructor(
		@InjectRepository(Setting)
		private settingRepository: Repository<Setting>,
	) {}

	async createOrUpdatesettings(
		mapping: FieldMappingDto,
		userId: string,
	): Promise<any> {
		try {
			Logger.debug('Received mapping:', mapping);

			// Check if setting with this key exists
			const existingSetting = await this.settingRepository.findOne({
				where: { key: mapping.key },
			});

			let savedMapping;
			if (existingSetting) {
				// Update existing setting
				existingSetting.value = mapping.value;
				existingSetting.updatedBy = userId;
				savedMapping = await this.settingRepository.save(existingSetting);
				Logger.debug('Updated existing mapping:', savedMapping);
			} else {
				// Create new setting
				const newMapping = this.settingRepository.create({
					key: mapping.key,
					value: mapping.value,
					createdBy: userId,
					updatedBy: userId,
				});
				savedMapping = await this.settingRepository.save(newMapping);
				Logger.debug('Created new mapping:', savedMapping);
			}

			return savedMapping;
		} catch (error) {
			Logger.error('Error saving mapping:', error);
			throw new Error(`Failed to update mappings: ${error.message}`);
		}
	}

	async getSettings(key: string): Promise<Setting> {
		const setting = await this.settingRepository.findOne({
			where: { key },
			order: { created: 'DESC' },
		});

		if (!setting) {
			throw new NotFoundException(`No setting found with key: ${key}`);
		}

		return setting;
	}
}
