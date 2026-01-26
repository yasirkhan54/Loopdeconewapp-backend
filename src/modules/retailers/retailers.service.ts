
import { Injectable, Logger, NotFoundException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { SupabaseConfigurationsService } from 'src/configurations';
// import { UserManagementService } from '../user-management/user-management.service';
import { RetailersQueryDto } from './dto/retailers-query.dto';
import { RetailersResponseDto } from './dto/retailers-response.dto';
import { UserProfile } from 'src/types';

@Injectable()
export class RetailersService {
  private readonly logger = new Logger(RetailersService.name);

  constructor(
    private readonly supabase: SupabaseConfigurationsService,
  ) { }

  async getAllRetailers(user: any) {
    const client = this.supabase.getAdminClient();

    const authUser = user.user;
    const authUserId = authUser.id;
    
    // console.log('client', client)
    /**
     * 🔐 Admin check
     */
    const { data: userRow } = await client
      .from('kv_store_df31eca9')
      .select('value')
      .eq('key', `user:${authUserId}`)
      .single();
    console.log('userRow', userRow)
    if (!userRow || userRow.value.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    /**
     * 1️⃣ Fetch all retailers
     */
    const { data: retailerRows, error: retailerError } = await client
      .from('kv_store_df31eca9')
      .select('value')
      .like('key', 'retailer:%');

    if (retailerError) {
      throw new InternalServerErrorException('Failed to load retailers');
    }

    const retailers = retailerRows.map(r => r.value);

    /**
     * 2️⃣ Fetch all retailer users (ONE QUERY)
     */
    const { data: userRows } = await client
      .from('kv_store_df31eca9')
      .select('value')
      .like('key', 'user:%')
      .eq('value->>role', 'retailer');

    const usersByOrg = new Map<string, any[]>();

    for (const row of userRows ?? []) {
      const u = row.value;
      if (!usersByOrg.has(u.organizationName)) {
        usersByOrg.set(u.organizationName, []);
      }
      usersByOrg.get(u.organizationName)!.push(u);
    }

    /**
     * 3️⃣ Aggregate returns by retailer (SQL-LEVEL)
     */
    const { data: returnStats, error: returnError } = await client
      .from('kv_returns_df31eca9')
      .select(`
        retailer_name,
        status,
        retailer_payout_amount
      `)
      .in('status', ['accepted', 'scheduled', 'completed']);

    if (returnError) {
      throw new InternalServerErrorException('Failed to load returns');
    }

    const returnMap = new Map<string, { count: number; value: number }>();

    for (const r of returnStats ?? []) {
      const key = r.retailer_name;
      if (!returnMap.has(key)) {
        returnMap.set(key, { count: 0, value: 0 });
      }

      const entry = returnMap.get(key)!;
      entry.count += 1;

      const payout = parseFloat(
        String(r.retailer_payout_amount ?? '0').replace(/[$,]/g, ''),
      );
      entry.value += isNaN(payout) ? 0 : payout;
    }

    /**
     * 4️⃣ Final response assembly
     */
    return {
      retailers: retailers.map(retailer => {
        const orgUsers = usersByOrg.get(retailer.name) ?? [];
        const stats = returnMap.get(retailer.name) ?? { count: 0, value: 0 };

        return {
          ...retailer,
          services: retailer.services ?? {
            returns: true,
            disposition: true,
          },
          users: orgUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.teamRole ?? 'Admin',
            status: u.status ?? 'active',
            lastActive: 'Never',
          })),
          activeUsers: orgUsers.length,
          totalReturns: stats.count,
          totalValue: `$${stats.value.toFixed(2)}`,
          recentReturns: [],
          recentLoads: [],
        };
      }),
    };
  }
}

