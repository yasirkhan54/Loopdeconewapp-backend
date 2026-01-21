import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './common/supabase/supabase.module';
import { DatabaseModule } from './common/database/database.module';
import { AppService } from './app.service';
import { ReturnsModule } from './modules/returns/returns.module';
import { AuthModule } from './common/auth/auth.module';
import { ClaimsModule } from './modules/claims/claims.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ReturnsModule,
    AuthModule,
    ClaimsModule
    // DatabaseModule,
  ],
  providers: [AppService],
})
export class AppModule {}
