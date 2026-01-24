import { Module } from '@nestjs/common';
import { ResellersController } from './resllers.controller';
import { ResellersService } from './resellers.service';
import { SupabaseConfigurationsModule } from 'src/configurations';
// import { UserManagementModule } from '../user-management/user-management.module';

@Module({
  imports: [
    SupabaseConfigurationsModule,
    // UserManagementModule,
  ],
  controllers: [ResellersController],
  providers: [ResellersService],
})
export class ResellersModule {}
