import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    const corsEnv = process.env.CORS_ORIGIN;
    const origins = corsEnv && corsEnv.trim() !== ''
        ? corsEnv.split(',').map((origin) => origin.trim())
        : ['http://localhost:5173'];

    console.log('Configured CORS Origins:', origins);

    app.enableCors({
        origin: origins,
        credentials: true,
    });

    // Enable validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Global prefix
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
