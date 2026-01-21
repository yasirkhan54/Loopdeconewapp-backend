import { Injectable } from '@nestjs/common';
import { SupabaseService } from './common/supabase/supabase.service';
import { DatabaseService } from './common/database/database.service';

@Injectable()
export class AppService {
  constructor(
    private readonly supabaseService: SupabaseService,
    // private readonly databaseService: DatabaseService,
  ) {}

  getHello() {
    return 'API is running';
  }
}
