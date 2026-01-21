import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsQueryDto } from './dto/returns-query.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';

@Controller('returns')
@UseGuards(SupabaseAuthGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  async getReturns(
    @Query() query: ReturnsQueryDto,
    @Req() req: any,
  ) {
    return this.returnsService.getPaginatedReturns({
      query,
      user: req.user,
    });
  }
}
