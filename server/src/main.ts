import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Specification line 317: Prefix /api/v1
  app.setGlobalPrefix('api/v1');
  app.enableCors();

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[API] Server is listening on http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('[API] Failed to bootstrap application', err);
  process.exit(1);
});
