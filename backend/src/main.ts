import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    try {
        const app = await NestFactory.create(AppModule);

        const corsEnv = process.env.CORS_ORIGIN;
        const origins = corsEnv && corsEnv.trim() !== ''
            ? corsEnv.split(',').map((origin) => origin.trim())
            : ['http://localhost:5173'];

        console.log('Configured CORS Origins:', origins);

        app.enableCors({
            origin: origins,
            credentials: true,
        });

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        app.setGlobalPrefix('api');

        const port = process.env.PORT || 3000;

        await app.listen(port);

        console.log(`🚀 Application is running on: ${port}`);
    } catch (error) {
        console.error('BOOTSTRAP ERROR:', error);
    }
}

bootstrap();