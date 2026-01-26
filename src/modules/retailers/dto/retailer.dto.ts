import { RetailerUserDto } from './retailer-user.dto';

export class RetailerDto {
  id: string;
  name: string;

  services: {
    returns: boolean;
    disposition: boolean;
  };

  users: RetailerUserDto[];

  activeUsers: number;
  totalReturns: number;
  totalValue: string;

  recentReturns: any[];
  recentLoads: any[];
}
