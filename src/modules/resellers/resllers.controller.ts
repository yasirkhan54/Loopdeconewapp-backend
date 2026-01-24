import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ResellersService } from './resellers.service';
import { ResellersQueryDto } from './dto/resellers-query.dto';

@Controller('resellers')
export class ResellersController {
  constructor(private readonly resellersService: ResellersService) {}

  @Get()
  async getResellers(
    @Query() query: ResellersQueryDto,
    @Req() req: any,
  ) {
    return this.resellersService.getPaginatedResellers({
      query
    });
  }
}
