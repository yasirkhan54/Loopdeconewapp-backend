import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { User } from '../../entities/user.entity';
import { SupabaseConfigurationsModule } from '../../configurations/supabase-configurations/supabase-configurations.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([User]),
		SupabaseConfigurationsModule, // Still needed for auth.admin operations (updateUserById, deleteUser)
	],
	controllers: [UserManagementController],
	providers: [UserManagementService],
	exports: [UserManagementService],
})
export class UserManagementModule { }
