import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateUserDto {
	@ApiProperty({ description: 'User email', required: false })
	@IsOptional()
	@IsString()
	email?: string;

	@ApiProperty({ description: 'User phone number', required: false })
	@IsOptional()
	@IsString()
	phone?: string;

	@ApiProperty({ description: 'User metadata', required: false, type: Object })
	@IsOptional()
	@IsObject()
	user_metadata?: Record<string, any>;
}
