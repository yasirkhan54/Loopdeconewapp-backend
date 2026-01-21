import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getClaimsForUser(user: any) {
    // 1️⃣ Fetch user profile (same as kv.get)
    const userProfile = await this.getUserProfile(user.id);

    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }

    try {
      // 2️⃣ Fetch claims (equivalent of getCachedOrFetch)
      const { data: claims, error } = await this.supabase.client
        .from('kv_claims_df31eca9') // ⚠️ adjust table name if different
        .select('*');

      if (error) {
        throw error;
      }

      let filteredClaims = claims ?? [];

      // 3️⃣ Role-based filtering (FIXED & CORRECT)
      if (userProfile.role === 'retailer') {
        filteredClaims = filteredClaims.filter(
          (c) => c.retailerId === userProfile.organizationId,
        );

        this.logger.log(
          `Retailer ${userProfile.organizationId} claims: ${filteredClaims.length}/${claims.length}`,
        );
      } else if (userProfile.role === 'reseller') {
        filteredClaims = filteredClaims.filter(
          (c) => c.resellerId === userProfile.organizationId,
        );

        this.logger.log(
          `Reseller ${userProfile.organizationId} claims: ${filteredClaims.length}/${claims.length}`,
        );
      } else {
        this.logger.log(`Admin claims: ${filteredClaims.length}`);
      }

      return { claims: filteredClaims };
    } catch (error: any) {
      this.logger.error('[Claims API] Error fetching claims', error.message);

      return {
        claims: [],
        error: 'Request timed out. Please try again or contact support.',
        timeout: true,
      };
    }
  }

  // 🔁 Same logic you used in returns
  private async getUserProfile(userId: string) {
    const { data, error } = await this.supabase.client
      .from('kv_store_df31eca9')
      .select('value')
      .eq('key', `user:${userId}`)
      .single();

    if (error || !data) {
      return null;
    }

    return data.value;
  }
}
