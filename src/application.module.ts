import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Postgres configurations
import { PostgresConfigurations } from './datasources/postgres.datasource';

// Common configurations
import { SupabaseSessionMiddleware } from './middleware';

// Modules
import { MODULES } from './modules';
import { ValidationSchema } from './configurations';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development'],
			validationSchema: ValidationSchema,
			validationOptions: {
				allowUnknown: true,
				abortEarly: true,
			},
		}),
		// TypeOrmModule.forRoot(PostgresConfigurations()),
		...MODULES,
	],
	providers: [SupabaseSessionMiddleware],
})
export class ApplicationModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(SupabaseSessionMiddleware)
			.exclude(
				{ path: 'authorization/*path', method: RequestMethod.ALL },
				{ path: 'health', method: RequestMethod.ALL },
				{ path: 'docs', method: RequestMethod.ALL },
				{ path: 'docs/*path', method: RequestMethod.ALL },
			)
			.forRoutes('*');
	}
}
