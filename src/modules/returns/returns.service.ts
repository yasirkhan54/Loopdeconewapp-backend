import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
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
  'pending assignment',
  'no-team-available',
  'no_team_available',
  'no team available',
  'cancelled',
  'donated',
  'pending_retailer_review',
  'pending-retailer-review',
  'pending retailer review',
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

  private normalizeIdentifier(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private matchesIdentifier(candidate: any, identifiers: Array<string | undefined | null>): boolean {
    if (!candidate) return false;

    if (Array.isArray(candidate)) {
      return candidate.some((entry) => this.matchesIdentifier(entry, identifiers));
    }

    if (typeof candidate === 'object') {
      return this.matchesIdentifier(candidate.id, identifiers) ||
        this.matchesIdentifier(candidate.name, identifiers) ||
        this.matchesIdentifier(candidate.organizationName, identifiers) ||
        this.matchesIdentifier(candidate.value, identifiers);
    }

    const normalizedCandidate = this.normalizeIdentifier(candidate);
    return identifiers
      .filter(Boolean)
      .some((identifier) => this.normalizeIdentifier(identifier) === normalizedCandidate);
  }

  private arrayContainsIdentifier(
    values: any,
    identifiers: Array<string | undefined | null>,
  ): boolean {
    return Array.isArray(values) && values.some((value) => this.matchesIdentifier(value, identifiers));
  }

  private normalizeStatus(status: any): string {
    return String(status ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-');
  }

  private getSearchableFields(returnData: any): string[] {
    const topLevelFields = [
      returnData?.id,
      returnData?.key,
      returnData?.retailerReturnId,
      returnData?.orderId,
      returnData?.customer,
      returnData?.customerName,
      returnData?.customerEmail,
      returnData?.email,
      returnData?.customerPhone,
      returnData?.phone,
      returnData?.item,
      returnData?.itemName,
      returnData?.sku,
      returnData?.address,
      returnData?.streetAddress,
      returnData?.city,
      returnData?.state,
      returnData?.zipCode,
      returnData?.retailer,
      returnData?.assignedReseller,
      returnData?.assignedResellerName,
      returnData?.itemLink,
      returnData?.productLink,
      returnData?.link,
    ];

    const itemFields = Array.isArray(returnData?.items)
      ? returnData.items.flatMap((item: any) => [
          item?.itemId,
          item?.itemName,
          item?.name,
          item?.sku,
          item?.color,
          item?.condition,
          item?.productLink,
          item?.link,
        ])
      : [];

    return [...topLevelFields, ...itemFields]
      .filter((value) => typeof value === 'string' || typeof value === 'number')
      .map((value) => String(value).toLowerCase());
  }

  private matchesSearch(returnData: any, search: string): boolean {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return true;

    return this.getSearchableFields(returnData).some((field) => field.includes(normalizedSearch));
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
    authUserId?: string;
    userId?: string;
    orgName?: string;
    profileName?: string;
  }): boolean {
    const { r, authUserId, userId, orgName, profileName } = params;
    const identifiers = [authUserId, userId, orgName, profileName];

    // Always show if assigned to this reseller
    if (
      this.matchesIdentifier(r.assignedResellerId, identifiers) ||
      this.matchesIdentifier(r.assignedReseller, identifiers) ||
      this.matchesIdentifier(r.assignedResellerName, identifiers)
    ) {
      return true;
    }

    // Hide if accepted by someone else
    if (r.acceptedBy) {
      if (!this.matchesIdentifier(r.acceptedBy, identifiers)) return false;
    }

    // Hide if hiddenFrom contains reseller
    if (this.arrayContainsIdentifier(r.hiddenFrom, identifiers)) {
      return false;
    }

    // Show if shared with this reseller org/user
    const sharedWithOk =
      this.arrayContainsIdentifier(r.sharedWith, identifiers) ||
      this.arrayContainsIdentifier(r.sharedWithResellers, identifiers);

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

  private canAccessReturn(params: {
    returnData: any;
    userRole: UserRole;
    authUserId?: string;
    userId?: string;
    orgName?: string;
    profileName?: string;
  }): boolean {
    const { returnData, userRole, authUserId, userId, orgName, profileName } = params;
    const identifiers = [authUserId, userId, orgName, profileName];

    if (userRole === 'admin') return true;

    if (userRole === 'retailer') {
      return Boolean(
        this.matchesIdentifier(returnData.retailerId, identifiers) ||
        this.matchesIdentifier(returnData.submittedBy, identifiers) ||
        this.matchesIdentifier(returnData.retailer, identifiers),
      );
    }

    if (userRole === 'reseller') {
      if (
        this.matchesIdentifier(returnData.assignedResellerId, identifiers) ||
        this.matchesIdentifier(returnData.assignedReseller, identifiers) ||
        this.matchesIdentifier(returnData.assignedResellerName, identifiers)
      ) {
        return true;
      }

      return this.resellerInMemoryVisible({
        r: returnData,
        authUserId,
        userId,
        orgName,
        profileName,
      });
    }

    return false;
  }

  async getReturnById({
    id,
    user,
  }: {
    id: string;
    user: any;
  }): Promise<{ return: any }> {
    const userProfile = await this.getByAuthUserId(user.id);
    const userRole = userProfile.role as UserRole;
    const authUserId = user.id;
    const userId = userProfile.id;
    const orgName = userProfile.organizationName;
    const profileName = userProfile.name;

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('kv_returns_df31eca9')
      .select('value')
      .eq('key', `return:${id}`)
      .maybeSingle();

    if (error) {
      this.logger.error('Return detail query error', error);
      throw new InternalServerErrorException('Failed to fetch return');
    }

    const returnData = data?.value;

    if (!returnData) {
      throw new NotFoundException('Return not found');
    }

    if (!this.canAccessReturn({ returnData, userRole, authUserId, userId, orgName, profileName })) {
      throw new ForbiddenException('This return is not available to you');
    }

    return { return: returnData };
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
    const authUserId = user.id;
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

    if (userRole === 'retailer') {
      const retailerVisibilityCondition = this.buildOrCondition([
        authUserId ? `retailer_id.eq.${authUserId}` : undefined,
        userId ? `retailer_id.eq.${userId}` : undefined,
        orgName ? `retailer_name.eq.${orgName}` : undefined,
        profileName ? `retailer_name.eq.${profileName}` : undefined,
      ]);

      if (retailerVisibilityCondition) {
        countQuery = countQuery.or(retailerVisibilityCondition);
        dataQuery = dataQuery.or(retailerVisibilityCondition);
      }
    }

    if (userRole === 'reseller' && (userId || orgName)) {
      // Edge DB pre-filter only (final filtering happens in-memory)
      const orCondition = this.buildOrCondition([
        authUserId ? `assigned_reseller_id.eq.${authUserId}` : undefined,
        userId ? `assigned_reseller_id.eq.${userId}` : undefined,
        orgName ? `assigned_reseller_name.eq.${orgName}` : undefined,
        profileName ? `assigned_reseller_name.eq.${profileName}` : undefined,
        orgName ? `shared_with_resellers.cs.{${orgName}}` : undefined,
        profileName ? `shared_with_resellers.cs.{${profileName}}` : undefined,
        authUserId ? `shared_with_resellers.cs.{${authUserId}}` : undefined,
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
    const sanitizedSearch = search && String(search).trim()
      ? this.sanitizeSearchString(String(search))
      : '';

    if (sanitizedSearch && userRole === 'admin') {
      const pattern = `%${sanitizedSearch}%`;
      const orCondition =
        `key.ilike.${pattern},` +
        `order_id.ilike.${pattern},` +
        `customer_name.ilike.${pattern},` +
        `item_name.ilike.${pattern},` +
        `address.ilike.${pattern},` +
        `sku.ilike.${pattern},` +
        `retailer_name.ilike.${pattern},` +
        `assigned_reseller_name.ilike.${pattern},` +
        `item_url.ilike.${pattern}`;

      countQuery = countQuery.or(orCondition);
      dataQuery = dataQuery.or(orCondition);
    }

    if (userRole === 'reseller' || userRole === 'retailer') {
      const fetchLimit = 2000;
      const { data: allData, error: dataError } = await dataQuery
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (dataError) {
        this.logger.error(`${userRole} data query error`, dataError);
        throw new InternalServerErrorException('Failed to fetch returns');
      }

      const allReturns = (allData || []).map((d: any) => this.stripHeavyFields(d.value));

      const filteredReturns = allReturns.filter((returnData: any) => {
        if (!this.canAccessReturn({
          returnData,
          userRole,
          authUserId,
          userId,
          orgName,
          profileName,
        })) {
          return false;
        }

        if (sanitizedSearch && !this.matchesSearch(returnData, sanitizedSearch)) {
          return false;
        }

        return true;
      });

      const paginated = filteredReturns.slice(offset, offset + safeLimit);
      const filteredCount = filteredReturns.length;
      const totalPages = Math.ceil(filteredCount / safeLimit);

      return {
        returns: paginated,
        totalCount: filteredCount,
        page: safePage,
        limit: safeLimit,
        totalPages,
        pagination: {
          page: safePage,
          limit: safeLimit,
          totalItems: filteredCount,
          totalPages,
          hasNextPage: safePage * safeLimit < filteredCount,
          hasPreviousPage: safePage > 1,
        },
      };
    }

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

    // ---------- Admin path: DB pagination ----------
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
