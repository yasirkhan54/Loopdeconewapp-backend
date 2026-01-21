import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseConfigurationsService implements OnModuleInit {
  private supabaseClient: SupabaseClient;
  private supabaseAdminClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase URL and Anon Key are required. Please check your environment variables.',
      );
    }

    // Regular client (for user operations)
    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });

    // Admin client (for service role operations - bypasses RLS)
    if (supabaseServiceRoleKey) {
      this.supabaseAdminClient = createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );
    }
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  getAdminClient(): SupabaseClient {
    if (!this.supabaseAdminClient) {
      throw new Error(
        'Supabase Service Role Key is not configured. Admin client is not available.',
      );
    }
    return this.supabaseAdminClient;
  }

  getConfig() {
    return {
      url: this.configService.get<string>('SUPABASE_URL'),
      anonKey: this.configService.get<string>('SUPABASE_ANON_KEY'),
      serviceRoleKey: this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
      jwtSecret: this.configService.get<string>('SUPABASE_JWT_SECRET'),
    };
  }
}

