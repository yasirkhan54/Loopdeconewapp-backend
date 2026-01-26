import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { RetailersService } from './retailers.service';
import { RetailersQueryDto } from './dto/retailers-query.dto';

@Controller('retailers')
export class RetailersController {
  constructor(private readonly retailersService: RetailersService) {}

  @Get()
  async getRetailers(
    @Query() query: RetailersQueryDto,
    @Req() req: any,
  ) {
    return this.retailersService.getAllRetailers({
      user: req.user,
    });
  }
}
