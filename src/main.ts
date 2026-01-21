import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ApplicationModule } from './application.module';

const bootstrap = async () => {
	const app = await NestFactory.create(ApplicationModule);

	// Cors configuration
	app.enableCors({
		origin: ['http://localhost:3000'],
		credentials: true,
	});

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
			// Keep null values instead of stripping them
			forbidUnknownValues: false,
			skipMissingProperties: false,
		}),
	);

	// Swagger configuration
	const config = new DocumentBuilder()
		.setTitle('Loopdecone API')
		.setDescription('Loopdecone Backend API Documentation')
		.setVersion('1.0')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				name: 'Authorization',
				description: 'Enter JWT token',
				in: 'header',
			},
			'bearer', // This name should match the security name used in controllers
		)
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('docs', app, document, {
		customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css',
		customJs: [
			'https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js',
			'https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-standalone-preset.js',
		],
		swaggerOptions: {
			persistAuthorization: true,
			tagsSorter: 'alpha', // Sort modules/tags alphabetically
			operationsSorter: 'method', // Sort operations by HTTP method (DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT)
		},
	});

	await app.listen(process.env.PORT ?? 3001).then(async () => {
		console.log('🚀 ------------------------------------------------ 🚀');
		console.log(`✅ Application is running on: http://localhost:${process.env.PORT ?? 3001}`);
		console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT ?? 3001}/docs`);
		console.log('🚀 ------------------------------------------------ 🚀');
	}).catch((error) => {
		console.error('❌', error);
	});

};

void bootstrap();
