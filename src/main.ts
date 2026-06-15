// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('backend.port', 8999);
  const host = configService.get<string>('backend.host', '0.0.0.0');

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Apply global auth guard
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Map Station API')
    .setDescription('API for managing stations, users, groups, and usage data')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Stations', 'Station management endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Groups', 'Group management endpoints')
    .addTag('Usage', 'Usage tracking endpoints')
    .addTag('Map', 'Map tile endpoints')
    .addTag('External Data', 'External API data endpoints')
    .addTag('Parameters', 'Get device parameters')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port, host);
  
  console.log(`
    🚀 Application is running on: http://${host}:${port}
    📚 API Documentation: http://${host}:${port}/api
    
    Quick Start:
    1. Register a user: POST http://${host}:${port}/auth/register
    2. Login: POST http://${host}:${port}/auth/login
    3. Use the JWT token in the Authorization header for protected endpoints
  `);
}
bootstrap();