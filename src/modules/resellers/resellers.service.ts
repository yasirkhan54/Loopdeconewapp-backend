
import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseConfigurationsService } from 'src/configurations';
// import { UserManagementService } from '../user-management/user-management.service';
import { ResellersQueryDto } from './dto/resellers-query.dto';
import { ReturnRow, Pagination, ResellersResponseDto } from './dto/resellers-response.dto';
import { UserProfile } from 'src/types';

@Injectable()
export class ResellersService {
  private readonly logger = new Logger(ResellersService.name);

  constructor(
    private readonly supabase: SupabaseConfigurationsService,
    // private readonly userManagementService: UserManagementService,
  ) { }

  async getPaginatedResellers({
    query,
  }: {
    query: ResellersQueryDto;
  }): Promise<ResellersResponseDto> {
    const { page = 1, limit = 10, search } = query;

    /**
     * 1️⃣ Pagination safety
     */
    let safePage = Number(page) || 1;
    let safeLimit = Number(limit) || 10;

    if (safePage < 1) safePage = 1;
    if (safeLimit < 1) safeLimit = 10;
    if (safeLimit > 100) safeLimit = 100;

    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    this.logger.log(
      `Resellers query: page=${safePage}, limit=${safeLimit}, search="${search ?? ''}"`,
    );

    try {
      const client = this.supabase.getAdminClient();

      /**
       * 2️⃣ Base query (IMPORTANT: count + range)
       */
      let supabaseQuery = client
        .from('kv_store_df31eca9')
        .select('value', { count: 'exact' })
        .like('key', 'user:%')
        .eq('value->>role', 'reseller')
        .range(from, to);

      /**
       * 3️⃣ Search (name + organizationName)
       */
      if (search) {
        const s = `%${search}%`;
        supabaseQuery = supabaseQuery.or(
          [
            `value->>name.ilike.${s}`,
            `value->>organizationName.ilike.${s}`,
          ].join(','),
        );
      }

      /**
       * 4️⃣ Execute
       */
      const { data, count, error } = await supabaseQuery;

      if (error) {
        this.logger.error('Supabase error', error.message);
        throw new InternalServerErrorException('Failed to fetch resellers');
      }

      const totalItems = count ?? 0;
      const resellers = (data ?? []).map(row => row.value);

      /**
       * 5️⃣ Final response
       */
      return {
        resellers,
        pagination: {
          page: safePage,
          limit: safeLimit,
          totalItems,
          totalPages: Math.ceil(totalItems / safeLimit),
          hasNextPage: safePage * safeLimit < totalItems,
          hasPreviousPage: safePage > 1,
        },
      };
    } catch (error: any) {
      this.logger.error(
        'Resellers query failed',
        error?.message ?? String(error),
      );
      throw new InternalServerErrorException('Unable to fetch resellers');
    }
  }



}
