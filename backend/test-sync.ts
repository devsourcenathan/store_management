import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DesktopSyncService } from './src/modules/sync/desktop-sync.service';

async function bootstrap() {
  console.log('Starting sync test...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(DesktopSyncService);
  try {
    await syncService.syncWithRemote();
    console.log('Sync completed.');
  } catch (error) {
    console.error('Sync failed:', error);
  }
  await app.close();
}
bootstrap();
