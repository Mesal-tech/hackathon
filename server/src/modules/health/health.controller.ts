import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('live')
  getLive() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  getReady() {
    return {
      status: 'READY',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
