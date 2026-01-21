import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { GetReturnsDto } from './dto/returns-query.dto';

@Injectable()
export class ReturnsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getReturns(dto: GetReturnsDto) {
    const { page, limit, search } = dto;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.client
      .from('kv_returns_df31eca9')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike('customer_name', `%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return {
      data: data ?? [],
      meta: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }
}
