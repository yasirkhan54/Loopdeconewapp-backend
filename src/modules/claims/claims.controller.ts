import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { ClaimsQueryDto } from './dto/claims-query.dto';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get()
  async getClaims(
    @Query() query: ClaimsQueryDto,
    @Req() req: any,
  ) {
    return this.claimsService.getPaginatedClaims(req.user, query);
  }
}
