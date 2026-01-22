import { Module } from '@nestjs/common';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { SupabaseConfigurationsModule } from 'src/configurations';
// import { UserManagementModule } from '../user-management/user-management.module';

@Module({
  imports: [
    SupabaseConfigurationsModule,
    // UserManagementModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
