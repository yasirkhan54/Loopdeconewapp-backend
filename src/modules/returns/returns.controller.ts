import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsQueryDto } from './dto/returns-query.dto';

@Controller('returns')
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
