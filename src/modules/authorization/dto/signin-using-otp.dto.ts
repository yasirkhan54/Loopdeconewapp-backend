import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class SignInUsingOtpDto {
	@ApiProperty({
		description: 'User email address',
		example: 'tenant_member@yopmail.com',
	})
	@IsEmail({}, { message: 'Please enter a valid email address' })
	@IsString({ message: 'Email must be a string' })
	email: string;
}
