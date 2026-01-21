import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import postgres from 'postgres';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  public readonly sql;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');

    this.sql = postgres(databaseUrl, {
      max: 5,
      idle_timeout: 20,
      // host_type: 'ipv4',
    } as any);
  }

  async onModuleInit() {
    try {
      await this.sql`SELECT 1`;
      this.logger.log('✅ Postgres connected successfully');
    } catch (error) {
      this.logger.error('❌ Postgres connection failed', error.message);
    }
  }
}
