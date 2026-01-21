import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength } from 'class-validator';

export class SignInUserDto {
	@ApiProperty({
		description: 'User email address',
		example: 'john.doe@example.com',
	})
	@IsEmail({}, { message: 'Please enter a valid email address' })
	email: string;

	@ApiProperty({
		description: 'User password',
		example: 'SecurePassword123!',
		minLength: 8,
	})
	@IsString({ message: 'Password must be a string' })
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	password: string;
}
