import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class ReturnsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string; // comma-separated

  @IsOptional()
  @IsString()
  retailer?: string;

  @IsOptional()
  @IsString()
  reseller?: string;

  @IsOptional()
  @IsString()
  condition?: string;
}
