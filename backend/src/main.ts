import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    // Local bundle support:
    // If APP_DATA_DIR is provided (e.g. from Electron), default local paths are derived from it.
    const appDataDir = process.env.APP_DATA_DIR;
    if (appDataDir && appDataDir.trim() !== '') {
        const resolved = path.resolve(appDataDir);
        try {
            fs.mkdirSync(resolved, { recursive: true });
        } catch { }

        if (!process.env.LOCAL_MEDIA_DIR) {
            process.env.LOCAL_MEDIA_DIR = path.join(resolved, 'media');
        }

        const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();
        if (dbProvider === 'sqlite' && !process.env.DATABASE_URL) {
            process.env.DATABASE_URL = `file:${path.join(resolved, 'stock.db')}`;
        }
    }

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

    // Optional: serve built frontend (SPA) from the same local server
    const frontendDist = process.env.SERVE_FRONTEND_DIR;
    if (frontendDist && frontendDist.trim() !== '') {
        const resolvedDist = path.resolve(frontendDist);
        app.useStaticAssets(resolvedDist);
        // SPA fallback (exclude API routes)
        app.getHttpAdapter().get('*', (req: any, res: any) => {
            if (req?.url?.startsWith('/api')) return res.status(404).send('Not found');
            return res.sendFile(path.join(resolvedDist, 'index.html'));
        });
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
