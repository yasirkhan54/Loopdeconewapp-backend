// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import { SupabaseService } from '../../common/supabase/supabase.service';
// import { GetReturnsDto } from './dto/returns-query.dto';

// @Injectable()
// export class ReturnsService {
//   constructor(private readonly supabase: SupabaseService) {}

//   async getReturns(dto: GetReturnsDto) {
//     const { page, limit, search } = dto;

//     const from = (page - 1) * limit;
//     const to = from + limit - 1;

//     let query = this.supabase.client
//       .from('kv_returns_df31eca9')
//       .select('*', { count: 'exact' })
//       .order('created_at', { ascending: false })
//       .range(from, to);

//     if (search) {
//       query = query.ilike('customer_name', `%${search}%`);
//     }

//     const { data, count, error } = await query;

//     if (error) {
//       throw new InternalServerErrorException(error.message);
//     }

//     return {
//       data: data ?? [],
//       meta: {
//         page,
//         limit,
//         total: count ?? 0,
//         totalPages: Math.ceil((count ?? 0) / limit),
//       },
//     };
//   }
// }
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { ReturnsQueryDto } from './dto/returns-query.dto';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getPaginatedReturns({
    query,
    user,
  }: {
    query: ReturnsQueryDto;
    user: any;
  }) {
    const {
      page,
      limit,
      search,
      status,
      retailer,
      reseller,
      condition,
    } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const statuses = status
      ? status.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    this.logger.log(
      `Returns query: page=${page}, limit=${limit}, search="${search}", status=${statuses}`,
    );

    try {
      let queryBuilder = this.supabase.client
        .from('kv_returns_df31eca9')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search) {
        queryBuilder = queryBuilder.ilike('customer_name', `%${search}%`);
      }

      if (statuses?.length) {
        queryBuilder = queryBuilder.in('status', statuses);
      }

      if (retailer) {
        queryBuilder = queryBuilder.eq('retailer_name', retailer);
      }

      if (reseller) {
        queryBuilder = queryBuilder.eq('assigned_reseller_name', reseller);
      }

      if (condition) {
        queryBuilder = queryBuilder.eq('condition', condition);
      }

      // Role-based filtering (same as Edge)
      if (user.user_metadata.role === 'retailer') {
        queryBuilder = queryBuilder.eq('retailer_id', user.id);
      }

      if (user.user_metadata.role === 'reseller') {
        queryBuilder = queryBuilder.eq('assigned_reseller_id', user.id);
      }

      const { data, count, error } = await queryBuilder;

      if (error) throw error;

      return {
        returns: data ?? [],
        pagination: {
          page,
          limit,
          totalItems: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limit),
          hasNextPage: page * limit < (count ?? 0),
          hasPreviousPage: page > 1,
        },
      };
    } catch (error: any) {
      this.logger.error('Returns query failed', error.message);

      return {
        returns: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        timeout: true,
        error: 'Request timed out. Please try again.',
      };
    }
  }
}
