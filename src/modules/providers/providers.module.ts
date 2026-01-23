import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { SupabaseConfigurationsModule } from 'src/configurations';
// import { UserManagementModule } from '../user-management/user-management.module';

@Module({
  imports: [SupabaseConfigurationsModule, 
    // UserManagementModule
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
