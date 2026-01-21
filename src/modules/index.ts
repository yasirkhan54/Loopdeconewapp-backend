import { SupabaseConfigurationsModule } from 'src/configurations'
import { UserManagementModule } from './user-management/user-management.module';
import { AuthorizationModule } from './authorization/authorization.module';

// Health module
import { HealthModule } from './health/health.module';

export const MODULES = [
  SupabaseConfigurationsModule,
  HealthModule,
];