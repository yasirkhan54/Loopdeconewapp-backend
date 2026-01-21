import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  public client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      throw new Error('Supabase env variables are missing');
    }

    this.client = createClient(url, key);
  }

  async onModuleInit() {
    const { error } = await this.client
      .from('kv_returns_df31eca9')
      .select('key')
      .limit(1);

    if (error) {
      this.logger.error('❌ Supabase connection failed', error.message);
    } else {
      this.logger.log('✅ Supabase connected successfully');
    }
  }
}
