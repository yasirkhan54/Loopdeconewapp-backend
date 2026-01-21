import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../types';

export const CurrentUser = createParamDecorator(
	(data: 'id' | 'email' | 'full' | undefined, ctx: ExecutionContext): string | AuthenticatedUser => {
		const request = ctx.switchToHttp().getRequest();
		const user = request.user;

		if (!user) {
			throw new BadRequestException('User not authenticated');
		}

		if (data === 'id') {
			return user.id;
		}

		if (data === 'email') {
			return user.email;
		}

		// Return full user object by default
		return user;
	},
);

export const CurrentUserId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
	const request = ctx.switchToHttp().getRequest();
	const user = request.user;

	if (!user?.id) {
		throw new BadRequestException('User ID not found in request');
	}

	return user.id;
});
