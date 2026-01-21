import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, MaxLength, Matches, IsPhoneNumber } from 'class-validator';
import { Match } from '../../../decorator/match.decorator';

export class RegisterUserDto {
	@ApiProperty({
		description: 'User first name',
		example: 'John',
		minLength: 2,
		maxLength: 50,
	})
	@IsString({ message: 'First name must be a string' })
	@MinLength(2, { message: 'First name must be at least 2 characters' })
	@MaxLength(50, { message: 'First name must be less than 50 characters' })
	first_name: string;

	@ApiProperty({
		description: 'User last name',
		example: 'Doe',
		minLength: 2,
		maxLength: 50,
	})
	@IsString({ message: 'Last name must be a string' })
	@MinLength(2, { message: 'Last name must be at least 2 characters' })
	@MaxLength(50, { message: 'Last name must be less than 50 characters' })
	last_name: string;

	@ApiProperty({
		description: 'User email address',
		example: 'john.doe@example.com',
	})
	@IsEmail({}, { message: 'Please enter a valid email address' })
	email: string;

	@ApiProperty({
		description: 'User phone number (with country code)',
		example: '+1234567890',
	})
	@IsPhoneNumber('US', { message: 'Please enter a valid US phone number' })
	phone: string;

	@ApiProperty({
		description: 'User password',
		example: 'SecurePassword123!',
		minLength: 8,
		maxLength: 20,
	})
	@IsString({ message: 'Password must be a string' })
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	@MaxLength(20, { message: 'Password must be no more than 20 characters' })
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
		message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
	})
	password: string;

	@ApiProperty({
		description: 'Password confirmation',
		example: 'SecurePassword123!',
	})
	@IsString({ message: 'Password confirmation must be a string' })
	@Match('password', { message: 'Passwords do not match' })
	confirm_password: string;
}
