import {
	Injectable,
	NotFoundException,
	InternalServerErrorException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseConfigurationsService } from '../../configurations/supabase-configurations';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserManagementService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly supabaseConfigurationsService: SupabaseConfigurationsService,
	) { }

	// Get Current User
	async getCurrentUser(userId: string) {
		try {
			const user = await this.userRepository.findOne({
				where: { id: userId },
			});

			if (!user) {
				throw new NotFoundException(`User with id ${userId} not found`);
			}

			return {
				id: user.id,
				email: user.email,
				phone: user.phone,
				user_metadata: user.user_metadata || {},
				created_at: user.created_at,
				updated_at: user.updated_at,
			};
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Get User By Email
	async getUserByEmail(email: string) {
		try {
			const user = await this.userRepository.findOne({
				where: { email },
			});

			if (!user) {
				throw new NotFoundException(`User with email ${email} not found`);
			}

			return {
				id: user.id,
				email: user.email,
				phone: user.phone,
				user_metadata: user.user_metadata || {},
				created_at: user.created_at,
				updated_at: user.updated_at,
			};
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Get User By ID
	async getUserById(id: string) {
		try {
			const user = await this.userRepository.findOne({
				where: { id },
			});

			if (!user) {
				throw new NotFoundException(`User with id ${id} not found`);
			}

			return {
				id: user.id,
				email: user.email,
				phone: user.phone,
				user_metadata: user.user_metadata || {},
				created_at: user.created_at,
				updated_at: user.updated_at,
			};
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Update User
	async updateUser(id: string, updateUserDto: UpdateUserDto, currentUserId: string) {
		// Only allow users to update their own profile, or require admin permissions
		if (id !== currentUserId) {
			throw new ForbiddenException('You can only update your own profile');
		}

		try {
			// Fetch existing user using TypeORM
			const existingUser = await this.userRepository.findOne({
				where: { id },
			});

			if (!existingUser) {
				throw new NotFoundException(`User with id ${id} not found`);
			}

			const updateData: Record<string, any> = {};

			if (updateUserDto.email !== undefined) {
				updateData.email = updateUserDto.email;
			}

			if (updateUserDto.phone !== undefined) {
				updateData.phone = updateUserDto.phone;
			}

			if (updateUserDto.user_metadata !== undefined) {
				// Merge with existing metadata
				const existingMetadata = existingUser.user_metadata || {};
				updateData.user_metadata = {
					...existingMetadata,
					...updateUserDto.user_metadata,
				};
			}

			// Use Supabase Auth Admin API for actual update (required for auth.users)
			const { data: userData, error } = await this.supabaseConfigurationsService
				.getAdminClient()
				.auth.admin.updateUserById(id, updateData);

			if (error || !userData?.user) {
				throw new BadRequestException(`Failed to update user: ${error?.message || 'Unknown error'}`);
			}

			return {
				id: userData.user.id,
				email: userData.user.email,
				phone: userData.user.phone,
				user_metadata: userData.user.user_metadata || {},
				created_at: userData.user.created_at,
				updated_at: userData.user.updated_at,
			};
		} catch (error) {
			if (
				error instanceof ForbiddenException ||
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Delete User
	async deleteUser(id: string, currentUserId: string) {
		// Prevent users from deleting themselves
		if (id === currentUserId) {
			throw new BadRequestException('You cannot delete your own account');
		}

		try {
			const { error } = await this.supabaseConfigurationsService.getAdminClient().auth.admin.deleteUser(id);

			if (error) {
				throw new BadRequestException(`Failed to delete user: ${error.message || 'Unknown error'}`);
			}

			return { message: 'User deleted successfully' };
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}
