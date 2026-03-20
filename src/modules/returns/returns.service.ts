import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import validator from 'validator';
import { SupabaseConfigurationsService } from 'src/configurations';

// Keep statuses aligned with Edge
const VALID_STATUSES = [
  'new',
  'working',
  'accepted',
  'scheduled',
  'completed',
  'pending-assignment',
  'pending_assignment',
  'no-team-available',
  'no_team_available',
  'cancelled',
  'donated',
  'pending_retailer_review',
  'pending-retailer-review',
];

type UserRole = 'admin' | 'retailer' | 'reseller';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);
  constructor(
    
    private readonly supabase: SupabaseConfigurationsService,
  ) {}

  // ---------- helpers (match Edge) ----------

  private validateStatuses(statuses: string[]): string[] {
    return (statuses || []).filter((s) => VALID_STATUSES.includes(s));
  }

  private sanitizeSearchString(search: string): string {
    if (!search) return '';
    let sanitized = search.trim();

    // same concept as Edge
    sanitized = validator.escape(sanitized);
    sanitized = sanitized.replace(/[%_]/g, '');
    sanitized = sanitized.slice(0, 100);
    sanitized = validator.unescape(sanitized);

    return sanitized;
  }

  private stripHeavyFields(returnData: any): any {
    if (!returnData) return returnData;

    const timelineSize = returnData.timeline?.length || 0;
    const imagesCount = Array.isArray(returnData.images) ? returnData.images.length : 0;
    const documentsCount = Array.isArray(returnData.documents) ? returnData.documents.length : 0;

    const { timeline, images, documents, ...rest } = returnData;

    rest.timelineCount = timelineSize;
    rest.imagesCount = imagesCount;
    rest.documentsCount = documentsCount;

    return rest;
  }

  private buildOrCondition(parts: Array<string | undefined | null | false>): string | undefined {
    const cleaned = parts
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);

    return cleaned.length ? cleaned.join(',') : undefined;
  }

  private resellerInMemoryVisible(params: {
    r: any;
    userId?: string;
    orgName?: string;
    profileName?: string;
  }): boolean {
    const { r, userId, orgName, profileName } = params;

    // Always show if assigned to this reseller
    if (userId && r.assignedResellerId === userId) return true;
    if (profileName && (r.assignedReseller === profileName || r.assignedResellerName === profileName)) {
      return true;
    }

    // Hide if accepted by someone else
    if (r.acceptedBy) {
      const acceptedByCurrentUser =
        (userId && r.acceptedBy === userId) ||
        (profileName && r.acceptedBy === profileName);

      if (!acceptedByCurrentUser) return false;
    }

    // Hide if hiddenFrom contains reseller
    if (Array.isArray(r.hiddenFrom)) {
      if (userId && r.hiddenFrom.includes(userId)) return false;
      if (orgName && r.hiddenFrom.includes(orgName)) return false;
      if (profileName && r.hiddenFrom.includes(profileName)) return false;
    }

    // Show if shared with this reseller org/user
    const sharedWithOk =
      (orgName && Array.isArray(r.sharedWith) && r.sharedWith.includes(orgName)) ||
      (orgName &&
        Array.isArray(r.sharedWithResellers) &&
        (r.sharedWithResellers.includes(orgName) || (userId && r.sharedWithResellers.includes(userId)))) ||
      (userId &&
        Array.isArray(r.sharedWithResellers) &&
        r.sharedWithResellers.includes(userId));

    return Boolean(sharedWithOk);
  }

  // ---------- user profile (small behavior alignment) ----------

  async getByAuthUserId(authUserId: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('kv_store_df31eca9')
      .select('value')
      .eq('key', `user:${authUserId}`)
      .maybeSingle(); // closer to Edge "maybeSingle"

    if (error) {
      throw new InternalServerErrorException('Failed to read user profile');
    }
    if (!data?.value) {
      throw new NotFoundException('User profile not found');
    }

    return data.value;
  }

  // ---------- main method: Edge-equivalent ----------

  async getPaginatedReturns({
    query,
    user,
  }: {
    query: any; // ReturnsQueryDto
    user: any;
  }): Promise<any> {
    const {
      page,
      limit,
      search,
      status,
      retailer,
      reseller,
      retailerName,
      resellerName,
      condition,
    } = query;

    // Same pagination constraints as Edge
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const offset = (safePage - 1) * safeLimit;

    const statuses = status
      ? String(status).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const userProfile = await this.getByAuthUserId(user.id);

    const userRole = userProfile.role as UserRole;
    const userId = userProfile.id;
    const orgName = userProfile.organizationName;
    const profileName = userProfile.name;
    const retailerFilter = retailerName || retailer;
    const resellerFilter = resellerName || reseller;

    const client = this.supabase.getAdminClient();

    // Build base queries like Edge: countQuery + dataQuery
    let countQuery = client
      .from('kv_returns_df31eca9')
      .select('*', { count: 'exact', head: true });

    let dataQuery = client
      .from('kv_returns_df31eca9')
      .select('value');

    // ---------- Role-based filtering (match Edge) ----------

    if (userRole === 'retailer' && orgName) {
      // Edge uses retailer_name == organizationName
      countQuery = countQuery.eq('retailer_name', orgName);
      dataQuery = dataQuery.eq('retailer_name', orgName);
    }

    if (userRole === 'reseller' && (userId || orgName)) {
      // Edge DB pre-filter only (final filtering happens in-memory)
      const orCondition = this.buildOrCondition([
        userId ? `assigned_reseller_id.eq.${userId}` : undefined,
        profileName ? `assigned_reseller_name.eq.${profileName}` : undefined,
        orgName ? `shared_with_resellers.cs.{${orgName}}` : undefined,
        userId ? `shared_with_resellers.cs.{${userId}}` : undefined,
      ]);

      if (orCondition) {
        countQuery = countQuery.or(orCondition);
        dataQuery = dataQuery.or(orCondition);
      }
    }

    // ---------- Status filter (validated like Edge) ----------

    if (statuses?.length) {
      const valid = this.validateStatuses(statuses);
      if (valid.length) {
        countQuery = countQuery.in('status', valid);
        dataQuery = dataQuery.in('status', valid);
      }
    }

    // ---------- Additional filters (match Edge options) ----------
    // Edge applies retailerName/resellerName as exact match on indexed name columns
    if (retailerFilter) {
      countQuery = countQuery.eq('retailer_name', retailerFilter);
      dataQuery = dataQuery.eq('retailer_name', retailerFilter);
    }

    if (resellerFilter) {
      countQuery = countQuery.eq('assigned_reseller_name', resellerFilter);
      dataQuery = dataQuery.eq('assigned_reseller_name', resellerFilter);
    }

    if (condition) {
      countQuery = countQuery.eq('condition', condition);
      dataQuery = dataQuery.eq('condition', condition);
    }

    // ---------- Search filter (sanitized like Edge) ----------
    if (search && String(search).trim()) {
      const sanitized = this.sanitizeSearchString(String(search));
      if (sanitized) {
        const pattern = `%${sanitized}%`;

        // include address + assigned_reseller_name like Edge
        const orCondition =
          `key.ilike.${pattern},` +
          `order_id.ilike.${pattern},` +
          `customer_name.ilike.${pattern},` +
          `item_name.ilike.${pattern},` +
          `address.ilike.${pattern},` +
          `sku.ilike.${pattern},` +
          `retailer_name.ilike.${pattern},` +
          `assigned_reseller_name.ilike.${pattern}`;

        countQuery = countQuery.or(orCondition);
        dataQuery = dataQuery.or(orCondition);
      }
    }

    // ---------- Execute count query ----------
    const { count, error: countError } = await countQuery;

    if (countError) {
      this.logger.error('Count query error', countError);
      throw new InternalServerErrorException('Failed to count returns');
    }

    const totalCount = Number(count || 0);

    // ---------- Reseller special behavior (Edge-equivalent) ----------
    if (userRole === 'reseller') {
      // Edge does NOT DB paginate for reseller. It fetches limited rows then filters in-memory.
      const fetchLimit = Math.min(safeLimit * 10, 500);

      const { data: allData, error: dataError } = await dataQuery
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (dataError) {
        this.logger.error('Reseller data query error', dataError);
        throw new InternalServerErrorException('Failed to fetch returns');
      }

      const allReturns = (allData || []).map((d: any) => this.stripHeavyFields(d.value));

      const filteredReturns = allReturns.filter((r: any) =>
        this.resellerInMemoryVisible({ r, userId, orgName, profileName }),
      );

      const paginated = filteredReturns.slice(offset, offset + safeLimit);
      const resellerTotalCount = filteredReturns.length;
      const resellerTotalPages = Math.ceil(resellerTotalCount / safeLimit);

      return {
        returns: paginated,
        totalCount: resellerTotalCount,
        page: safePage,
        limit: safeLimit,
        totalPages: resellerTotalPages,
        pagination: {
          page: safePage,
          limit: safeLimit,
          totalItems: resellerTotalCount,
          totalPages: resellerTotalPages,
          hasNextPage: safePage * safeLimit < resellerTotalCount,
          hasPreviousPage: safePage > 1,
        },
      };
    }

    // ---------- Non-reseller path: DB pagination like Edge ----------
    const { data, error: dataError } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (dataError) {
      this.logger.error('Data query error', dataError);
      throw new InternalServerErrorException('Failed to fetch returns');
    }

    const returns = (data || []).map((d: any) => this.stripHeavyFields(d.value));
    const totalPages = Math.ceil(totalCount / safeLimit);

    return {
      returns,
      totalCount,
      page: safePage,
      limit: safeLimit,
      totalPages,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems: totalCount,
        totalPages,
        hasNextPage: safePage * safeLimit < totalCount,
        hasPreviousPage: safePage > 1,
      },
    };
  }
}
