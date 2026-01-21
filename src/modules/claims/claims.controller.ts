import {
  Controller,
  Get,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';

@Controller('make-server-df31eca9/claims')
@UseGuards(SupabaseAuthGuard)
export class ClaimsController {
  private readonly logger = new Logger(ClaimsController.name);

  constructor(private readonly claimsService: ClaimsService) {}

  @Get()
  async getClaims(@Req() req: Request) {
    const user = req['user']; // injected by SupabaseAuthGuard

    this.logger.log(`Fetching claims for user ${user.id}`);

    return this.claimsService.getClaimsForUser(user);
  }
}
