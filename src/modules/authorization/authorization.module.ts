// NestJS
import { Module } from '@nestjs/common';

// Controllers
import { AuthorizationController } from './authorization.controller';

// Services
import { AuthorizationService } from './authorization.service';

// Configurations
import { SupabaseConfigurationsModule } from '../../configurations/supabase-configurations/supabase-configurations.module';

// Modules
import { UserManagementModule } from '../user-management/user-management.module';

@Module({
	imports: [
		// Configurations	
		SupabaseConfigurationsModule,

		// Modules
		UserManagementModule,
	],
	controllers: [AuthorizationController],
	providers: [AuthorizationService],
	exports: [AuthorizationService],
})
export class AuthorizationModule { }
