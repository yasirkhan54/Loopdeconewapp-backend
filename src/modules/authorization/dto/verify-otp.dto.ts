import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum } from 'class-validator';

export class VerifyOtpDto {
	@ApiProperty({
		description: 'User email address',
		example: 'tenant_member@yopmail.com',
	})
	@IsEmail({}, { message: 'Please enter a valid email address' })
	@IsString({ message: 'Email must be a string' })
	email: string;

	@ApiProperty({
		description: 'OTP token received via email',
		example: '123456',
	})
	@IsString({ message: 'Token must be a string' })
	token: string;
}
