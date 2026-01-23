import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProvidersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  // Filters
  @IsOptional()
  @IsString()
  status?: string;       // new-claim

  @IsOptional()
  @IsString()
  type?: string;         // return

  @IsOptional()
  @IsString()
  retailer?: string;     // Yasir Khan Funitures

  @IsOptional()
  @IsString()
  filters?: string;   

  @IsOptional()
  @IsString()
  search?: string;       // CLAIM-658 / item / reseller
}
