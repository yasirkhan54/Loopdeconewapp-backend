import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    // 🔐 Verify token with Supabase
    const { data, error } = await this.supabase.client.auth.getUser(token);
    

    if (error || !data?.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    /**
     * Attach user to request
     * This replaces `authResult.user` from Edge
     */
    (request as any).user = data.user;

    return true;
  }
}
