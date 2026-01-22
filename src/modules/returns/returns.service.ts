
import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseConfigurationsService } from 'src/configurations';
// import { UserManagementService } from '../user-management/user-management.service';
import { ReturnsQueryDto } from './dto/returns-query.dto';
import { ReturnRow, Pagination, ReturnsResponseDto } from './dto/returns-response.dto';
import { UserProfile } from 'src/types';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly supabase: SupabaseConfigurationsService,
    // private readonly userManagementService: UserManagementService,
  ) { }

  async getPaginatedReturns({
    query,
    user,
  }: {
    query: ReturnsQueryDto;
    user: any;
  }): Promise<ReturnsResponseDto> {
    const {
      page,
      limit,
      search,
      status,
      retailer,
      reseller,
      condition,
    } = query;
    // Validate pagination inputs and enforce sane defaults/limits
    let safePage = Number(page) || 1;
    let safeLimit = Number(limit) || 10;
    if (safePage < 1) safePage = 1;
    const MAX_LIMIT = 100;
    if (safeLimit < 1) safeLimit = 10;
    if (safeLimit > MAX_LIMIT) safeLimit = MAX_LIMIT;

    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const statuses = status
      ? String(status).split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    this.logger.log(
      `Returns query: page=${page}, limit=${limit}, search="${search}", status=${statuses}`,
    );

    try {
      const client = this.supabase.getAdminClient();
      const userProfile = (await this.getByAuthUserId(user.id)) as UserProfile;

      // Select only the columns we need for the listing to reduce payload
      let dbQuery = client
        .from('kv_returns_df31eca9')
        .select(
          `key,value,order_id,customer_name,item_name,sku,retailer_name,status,retailer_id,assigned_reseller_id,assigned_reseller_name,condition,created_at`,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false });

      /**
       * 🔍 SEARCH (multi-column, OR-based)
       */
      if (search) {
        const s = `%${String(search)}%`;
        dbQuery = dbQuery.or([
          `key.ilike.${s}`,
          `order_id.ilike.${s}`,
          `customer_name.ilike.${s}`,
          `item_name.ilike.${s}`,
          `sku.ilike.${s}`,
          `retailer_name.ilike.${s}`,
        ].join(','));
      }

      /**
       * ✅ STATUS FILTER
       */
      if (statuses?.length) {
        dbQuery = dbQuery.in('status', statuses);
      }

      /**
       * 🏬 RETAILER FILTER
       */
      if (retailer) {
        dbQuery = dbQuery.eq('retailer_name', retailer);
      }

      /**
       * 🤝 RESELLER FILTER
       */
      if (reseller) {
        dbQuery = dbQuery.eq('assigned_reseller_name', reseller);
      }

      /**
       * 📦 CONDITION FILTER
       */
      if (condition) {
        dbQuery = dbQuery.eq('condition', condition);
      }

      /**
       * 🔐 ROLE-BASED ACCESS (SQL-LEVEL)
       */
      if (userProfile.role === 'retailer') {
        dbQuery = dbQuery.eq('retailer_id', userProfile.id);
      }

      if (userProfile.role === 'reseller') {
        dbQuery = dbQuery.eq('assigned_reseller_id', userProfile.id);
      }

      /**
       * 📄 PAGINATION (LAST)
       */
      dbQuery = dbQuery.range(from, to);

      /**
       * 🚀 EXECUTE
       */
      const { data, count, error } = await dbQuery;

      if (error) {
        this.logger.error('Supabase error', error.message ?? error);
        throw new InternalServerErrorException('Failed to query returns');
      }

      const total = Number(count ?? 0);
      const returns = ((data as any[]) ?? []).map(row => row.value);
      return {
        returns,
        pagination: {
          page: safePage,
          limit: safeLimit,
          totalItems: total,
          totalPages: Math.ceil(total / safeLimit),
          hasNextPage: safePage * safeLimit < total,
          hasPreviousPage: safePage > 1,
        },
      } as ReturnsResponseDto;

    } catch (error: any) {
      // Preserve NotFound for upstream handling (missing user profile)
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Returns query failed', error?.message ?? String(error));
      throw new InternalServerErrorException('Unable to fetch returns');
    }
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
