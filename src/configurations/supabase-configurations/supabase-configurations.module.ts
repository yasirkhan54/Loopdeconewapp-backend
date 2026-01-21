import { Module, Global } from '@nestjs/common';
import { SupabaseConfigurationsService } from './supabase-configurations.service';

@Global()
@Module({
  providers: [SupabaseConfigurationsService],
  exports: [SupabaseConfigurationsService],
})
export class SupabaseConfigurationsModule { }

