import { SupabaseConfigurationsModule } from 'src/configurations'
import { UserManagementModule } from './user-management/user-management.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { ReturnsModule } from './returns/returns.module';
import { ClaimsModule } from './claims/claims.module';
import { ProvidersModule } from './providers/providers.module';
import { ResellersModule } from './resellers/resellers.module';
import { RetailersModule } from './retailers/retailers.module';

// Health module
import { HealthModule } from './health/health.module';

export const MODULES = [
  SupabaseConfigurationsModule,
  HealthModule,
  ReturnsModule,
  ClaimsModule,
  ProvidersModule,
  ResellersModule,
  RetailersModule
];