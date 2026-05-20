import 'reflect-metadata';
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ensureDesktopDatabase } from './common/prisma/desktop-db.init';

async function bootstrap() {
    // Local bundle support:
    // If APP_DATA_DIR is provided (e.g. from Electron), default local paths are derived from it.
    const appDataDir = process.env.APP_DATA_DIR;
    if (appDataDir && appDataDir.trim() !== '') {
        const resolved = path.resolve(appDataDir);
        try {
            fs.mkdirSync(resolved, { recursive: true });
        } catch { }

        if ((process.env.DB_PROVIDER || '').toLowerCase() === 'sqlite') {
            await ensureDesktopDatabase(resolved);
        }

        // In desktop/local-bundle mode we use SQLite; prefer the "library" engine to avoid spawning.
        // (Binary engine requires spawning an engine executable which often fails in packaged contexts.)
        if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
            const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();
            process.env.PRISMA_CLIENT_ENGINE_TYPE = dbProvider === 'sqlite' ? 'library' : 'binary';
        }

        if (!process.env.LOCAL_MEDIA_DIR) {
            process.env.LOCAL_MEDIA_DIR = path.join(resolved, 'media');
        }

        const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();
        if (dbProvider === 'sqlite') {
            const dbPath = path.join(resolved, 'stock.db').replaceAll('\\', '/');
            // Always override: desktop child must not use Postgres DATABASE_URL from .env.
            process.env.DATABASE_URL = `file:${dbPath}`;
        }
    }

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Enable CORS
    const corsEnv = process.env.CORS_ORIGIN;
    let origins =
        corsEnv && corsEnv.trim() !== ''
            ? corsEnv.split(',').map((origin) => origin.trim())
            : ['http://localhost:5173'];

    if (process.env.LOCAL_BUNDLE === 'true') {
        const port = process.env.PORT || '3100';
        const desktopOrigins = [
            `http://127.0.0.1:${port}`,
            `http://localhost:${port}`,
        ];
        origins = [...new Set([...origins, ...desktopOrigins])];
    }

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
        // SPA fallback (exclude API routes). Use middleware so it doesn't interfere with Nest route registration.
        app.use((req: any, res: any, next: any) => {
            if (req?.url?.startsWith('/api')) return next();
            return res.sendFile(path.join(resolvedDist, 'index.html'));
        });
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
