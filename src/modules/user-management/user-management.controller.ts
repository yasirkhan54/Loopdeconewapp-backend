import {
	Controller,
	Get,
	Put,
	Delete,
	Body,
	Param,
	Req,
	HttpCode,
	HttpStatus,
	NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserManagementService } from './user-management.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('User Management')
@Controller('user-management')
export class UserManagementController {
	constructor(private readonly userManagementService: UserManagementService) {}

	@Get('users/current')
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Get current user profile',
		description: 'Gets the profile of the currently authenticated user',
	})
	@ApiResponse({
		status: 200,
		description: 'User profile fetched successfully',
	})
	@ApiResponse({
		status: 404,
		description: 'User not found',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getCurrentUser(@Req() req: Request) {
		if (!req.user?.id) {
			throw new NotFoundException('User not authenticated');
		}

		const data = await this.userManagementService.getCurrentUser(req.user.id);
		return {
			statusCode: HttpStatus.OK,
			message: 'User profile fetched successfully',
			data,
		};
	}

	@Get('users/email/:email')
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Get user by email',
		description: 'Retrieves a user profile by email address',
	})
	@ApiParam({ name: 'email', description: 'User email address' })
	@ApiResponse({ status: 200, description: 'User fetched successfully' })
	@ApiResponse({
		status: 404,
		description: 'User not found',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getUserByEmail(@Param('email') email: string) {
		const data = await this.userManagementService.getUserByEmail(email);
		return {
			statusCode: HttpStatus.OK,
			message: 'User fetched successfully',
			data,
		};
	}

	@Get('users/:id')
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Get user by ID',
		description: 'Retrieves a user profile by user ID',
	})
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User fetched successfully' })
	@ApiResponse({
		status: 404,
		description: 'User not found',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getUserById(@Param('id') id: string) {
		const data = await this.userManagementService.getUserById(id);
		return {
			statusCode: HttpStatus.OK,
			message: 'User fetched successfully',
			data,
		};
	}

	@Put('users/:id')
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Update user',
		description: 'Updates user information. Users can only update their own profile.',
	})
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User updated successfully' })
	@ApiResponse({
		status: 400,
		description: 'Bad request - Invalid input data',
	})
	@ApiResponse({
		status: 403,
		description: 'Forbidden - You can only update your own profile',
	})
	@ApiResponse({
		status: 404,
		description: 'User not found',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: Request) {
		if (!req.user?.id) {
			throw new NotFoundException('User not authenticated');
		}

		const data = await this.userManagementService.updateUser(id, updateUserDto, req.user.id);
		return {
			statusCode: HttpStatus.OK,
			message: 'User updated successfully',
			data,
		};
	}

	@Delete('users/:id')
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Delete user',
		description: 'Deletes a user account. Users cannot delete their own account.',
	})
	@ApiParam({ name: 'id', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User deleted successfully' })
	@ApiResponse({
		status: 400,
		description: 'Bad request - Cannot delete your own account',
	})
	@ApiResponse({
		status: 404,
		description: 'User not found',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@HttpCode(HttpStatus.OK)
	async deleteUser(@Param('id') id: string, @Req() req: Request) {
		if (!req.user?.id) {
			throw new NotFoundException('User not authenticated');
		}

		const data = await this.userManagementService.deleteUser(id, req.user.id);
		return {
			statusCode: HttpStatus.OK,
			message: 'User deleted successfully',
			data,
		};
	}
}
