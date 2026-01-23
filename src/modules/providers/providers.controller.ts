import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersQueryDto } from './dto/providers-query.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  async getProviders(
    @Query() query: ProvidersQueryDto,
    @Req() req: any,
  ) {
    return this.providersService.getPaginatedProviders(req.user, query);
  }
}
