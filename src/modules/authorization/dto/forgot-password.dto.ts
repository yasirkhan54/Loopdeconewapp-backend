import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
	@ApiProperty({
		description: 'User email address',
		example: 'john.doe@example.com',
	})
	@IsEmail({}, { message: 'Please enter a valid email address' })
	email: string;
}

