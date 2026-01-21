import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// Types
import { AuthenticatedUser } from '../types';

// Configurations
import { SupabaseConfigurationsService } from '../configurations/supabase-configurations';

@Injectable()
export class SupabaseSessionMiddleware implements NestMiddleware {
	constructor(private readonly supabaseConfigurationsService: SupabaseConfigurationsService) { }

	async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
		const authorization = req.headers.authorization;

		// Skip authentication for public routes (Swagger, health checks, etc.)
		if (this.isPublicRoute(req.path)) {
			return next();
		}

		// Require authorization header for protected routes
		if (!authorization) {
			throw new UnauthorizedException('Missing Authorization header. Please provide a Bearer token.');
		}

		try {
			const accessToken = this.extractBearerToken(authorization);
			const { data, error } = await this.supabaseConfigurationsService.getClient().auth.getUser(accessToken);

			if (error) {
				throw new UnauthorizedException(error.message);
			}

			const authenticatedUser: AuthenticatedUser = {
				id: data.user.id,
				email: data.user.email,
				phone: data.user.phone,
				metadata: data.user.user_metadata ?? undefined
			};

			req.user = authenticatedUser;

			next();
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException(
				`Authentication failed: ${error instanceof Error ? error.message : 'Invalid token'}`,
			);
		}
	}

	private isPublicRoute(path: string): boolean {
		const publicRoutes = ['/docs', '/health'];
		return publicRoutes.some((route) => path.startsWith(route));
	}

	private extractBearerToken(header: string): string {
		const [scheme, token] = header.split(' ');
		const isBearer = scheme?.toLowerCase() === 'bearer';

		if (!isBearer || !token) {
			throw new UnauthorizedException('Invalid Authorization header format. Expected: Bearer <token>');
		}

		return token;
	}
}
