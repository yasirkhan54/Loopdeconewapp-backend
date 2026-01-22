
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseConfigurationsService } from 'src/configurations';
// import { UserManagementService } from '../user-management/user-management.service';
import { ClaimsQueryDto } from './dto/claims-query.dto';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly supabase: SupabaseConfigurationsService,
    // private readonly userManagementService: UserManagementService, 
  ) { }

//   async getPaginatedClaims({
//     query,
//     user,
//   }: {
//     query: ClaimsQueryDto;
//     user: any;
//   }) {
//     const {
//       page,
//       limit,
//       search,
//       status,
//       retailer,
//       reseller,
//       condition,
//     } = query;
//     const from = (page - 1) * limit;
//     const to = from + limit - 1;

//     const statuses = status
//       ? status.split(',').map(s => s.trim()).filter(Boolean)
//       : undefined;

//     this.logger.log(
//       `Returns query: page=${page}, limit=${limit}, search="${search}", status=${statuses}`,
//     );

//     try {
//       // let queryBuilder = this.supabase.getAdminClient()
//       //   .from('kv_returns_df31eca9')
//       //   .select('*', { count: 'exact' })
//       //   .order('created_at', { ascending: false })
//       //   .range(from, to);

//       // if (search) {
//       //   queryBuilder = queryBuilder.ilike('customer_name', `%${search}%`);
//       // }

//       // if (statuses?.length) {
//       //   queryBuilder = queryBuilder.in('status', statuses);
//       // }

//       // if (retailer) {
//       //   queryBuilder = queryBuilder.eq('retailer_name', retailer);
//       // }

//       // if (reseller) {
//       //   queryBuilder = queryBuilder.eq('assigned_reseller_name', reseller);
//       // }

//       // if (condition) {
//       //   queryBuilder = queryBuilder.eq('condition', condition);
//       // }

//       // // Role-based filtering (same as Edge)
//       // if (user.role === 'retailer') {
//       //   queryBuilder = queryBuilder.eq('retailer_id', user.id);
//       // }

//       // if (user.role === 'reseller') {
//       //   queryBuilder = queryBuilder.eq('assigned_reseller_id', user.id);
//       // }

//       // const { data, count, error } = await queryBuilder;

//       // if (error) throw error;


//        // const client = this.supabase.getAdminClient();
//       const userProfile = await this.getByAuthUserId(user.id);
//       console.log('userProfile in claims service', userProfile)
//       // let query = client
//       //   .from('kv_returns_df31eca9')
//       //   .select('*', { count: 'exact' })
//       //   .order('created_at', { ascending: false })
//       //   .range(from, to);

//      let query = this.supabase
//         .getAdminClient()
//         .from('kv_store_df31eca9')
//         .select('value', { count: 'estimated' })
//         .like('key', 'claim:%')
//         .range(from, to);

//       /**
//        * 3️⃣ Role-based filtering (SQL-level, NOT in-memory)
//        */
//       if (userProfile.role === 'retailer') {
//         query = query.eq('value->>retailerId', userProfile.id);
//       }

//       if (userProfile.role === 'reseller') {
//         query = query.eq('value->>resellerId', userProfile.id);
//       }

//       const { data, count, error } = await query;

//       if (error) {
//         throw error;
//       }


//       return {
//         claims: data ?? [],
//         pagination: {
//           page,
//           limit,
//           totalItems: count ?? 0,
//           totalPages: Math.ceil((count ?? 0) / limit),
//           hasNextPage: page * limit < (count ?? 0),
//           hasPreviousPage: page > 1,
//         },
//       };
//     } catch (error: any) {
//       this.logger.error('Returns query failed', error.message);

//       return {
//         returns: [],
//         pagination: {
//           page,
//           limit,
//           totalItems: 0,
//           totalPages: 0,
//           hasNextPage: false,
//           hasPreviousPage: false,
//         },
//         timeout: true,
//         error: 'Request timed out. Please try again.',
//       };
//     }
//   }

async getPaginatedClaims(
    userProfile: any,
    filters: ClaimsQueryDto,
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .getAdminClient()
      .from('kv_store_df31eca9')
      .select('value', { count: 'estimated' })
      .like('key', 'claim:%')
      .range(from, to);

    /**
     * 1️⃣ Role-based filtering (PRIMARY)
     */
    if (userProfile.role === 'retailer') {
      query = query.eq('value->>retailerId', userProfile.id);
    }

    if (userProfile.role === 'reseller') {
      query = query.eq('value->>resellerId', userProfile.id);
    }

    /**
     * 2️⃣ Status filter
     */
    if (filters.status && filters.status !== 'all') {
      query = query.eq('value->>status', filters.status);
    }

    /**
     * 3️⃣ Type filter
     */
    if (filters.type && filters.type !== 'all') {
      query = query.eq('value->>type', filters.type);
    }

    /**
     * 4️⃣ Retailer filter
     */
    if (filters.retailer && filters.retailer !== 'all') {
      query = query.eq('value->>retailer', filters.retailer);
    }

    /**
     * 5️⃣ Search filter (id | itemId | itemName | reseller)
     */
    if (filters.search) {
      const s = `%${filters.search}%`;

      query = query.or(
        [
          `value->>id.ilike.${s}`,
          `value->>itemId.ilike.${s}`,
          `value->>itemName.ilike.${s}`,
          `value->>reseller.ilike.${s}`,
        ].join(','),
      );
    }

    /**
     * 6️⃣ Execute query
     */
    const { data, count, error } = await query;

    if (error) {
      this.logger.error(error.message);
      throw error;
    }

    /**
     * 7️⃣ Normalize response (MATCH CLIENT FORMAT)
     */
    const claims = (data ?? []).map(row => row.value);

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      claims,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
}


  async getByAuthUserId(authUserId: string) {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('kv_store_df31eca9')
          .select('value')
          .eq('key', `user:${authUserId}`)
          .single();
    
        if (error || !data) {
          throw new NotFoundException('User profile not found');
        }
    
        return data.value;
      }
}
