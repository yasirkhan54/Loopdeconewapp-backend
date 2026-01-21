import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    example: {
      status: 'ok',
      timestamp: '2024-01-15T10:30:00.000Z',
      uptime: 1234.56,
      environment: 'development',
      version: '1.0.0',
    },
  })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    example: {
      status: 'ok',
      timestamp: '2024-01-15T10:30:00.000Z',
      uptime: 1234.56,
      environment: 'development',
      version: '1.0.0',
      memory: {
        used: 45.67,
        total: 128.0,
        unit: 'MB',
      },
      node: {
        version: 'v20.10.0',
        platform: 'darwin',
      },
    },
  })
  getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }
}

