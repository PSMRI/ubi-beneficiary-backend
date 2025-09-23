import { HttpModule } from '@nestjs/axios';
import { Module, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HasuraService } from './services/hasura/hasura.service';
import { ProxyService } from './services/proxy/proxy.service';
import { LoggerService } from './logger/logger.service';
import { ContentModule } from './content/content.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ContentService } from './content/content.service';
import { ResponseCache } from './entity/response.entity';
import { UserModule } from './modules/users/users.module';
import { User } from './entity/user.entity';
import { EncryptionService } from './common/helper/encryptionService';
import { UserRolesModule } from './modules/user_roles/user_roles.module';
import { Role } from '@entities/role.entity';
import { UserRole } from '@entities/user_roles.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { OtpModule } from '@modules/otp/otp.module';
import { AuthMiddleware } from './common/middlewares/auth.middleware';
import { CustomFieldsModule } from './modules/customfields/customfields.module';
import { AdminModule } from './modules/admin/admin.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: async (
				configService: ConfigService
			): Promise<TypeOrmModuleOptions> => ({
				type: configService.get<
					'postgres' | 'mysql' | 'sqlite' | 'mariadb'
				>('DB_TYPE'),
				host: configService.get<string>('DB_HOST'),
				port: parseInt(configService.get<string>('DB_PORT'), 10),
				username: configService.get<string>('DB_USERNAME'),
				password: configService.get<string>('DB_PASSWORD'),
				database: configService.get<string>('DB_NAME'),
				entities: [__dirname + '/**/*.entity{.ts,.js}'],
				synchronize: false,
				// logging: true,
			}),
		}),
		TypeOrmModule.forFeature([ResponseCache, User, UserRole, Role]),
		{
			...HttpModule.register({}),
			global: true,
		},
		ContentModule,
		UserModule,
		UserRolesModule,
		AuthModule,
		OtpModule,
		CustomFieldsModule,
		AdminModule,
		HousekeepingModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		HasuraService,
		ProxyService,
		LoggerService,
		ContentService,
		EncryptionService,
	],
})
export class AppModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(AuthMiddleware)
			.forRoutes({ path: '/*', method: RequestMethod.ALL }); // this will not affect the existing UI and apis
	}
}
