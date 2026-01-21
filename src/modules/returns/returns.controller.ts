import { Controller, Get, Query } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { GetReturnsDto } from './dto/returns-query.dto';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  async getReturns(@Query() query: GetReturnsDto) {
    return this.returnsService.getReturns(query);
  }
}
