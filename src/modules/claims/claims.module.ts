import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { SupabaseConfigurationsModule } from 'src/configurations';
// import { UserManagementModule } from '../user-management/user-management.module';

@Module({
  imports: [SupabaseConfigurationsModule, 
    // UserManagementModule
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService],
})
export class ClaimsModule {}
