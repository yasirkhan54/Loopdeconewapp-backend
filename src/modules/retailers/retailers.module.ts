import { Module } from '@nestjs/common';
import { RetailersController } from './retailers.controller';
import { RetailersService } from './retailers.service';
import { SupabaseConfigurationsModule } from 'src/configurations';
// import { UserManagementModule } from '../user-management/user-management.module';

@Module({
  imports: [
    SupabaseConfigurationsModule,
    // UserManagementModule,
  ],
  controllers: [RetailersController],
  providers: [RetailersService],
})
export class RetailersModule {}
