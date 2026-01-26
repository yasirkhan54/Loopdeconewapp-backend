import { RetailerDto } from './retailer.dto';
import { PaginationDto } from '../dto/pagination.dto';

export class RetailersResponseDto {
  retailers: RetailerDto[];
  pagination: PaginationDto;
}
