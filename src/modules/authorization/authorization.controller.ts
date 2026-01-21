import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthorizationService } from './authorization.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { SignInUserDto } from './dto/signin-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginWithOtpDto } from './dto/login-with-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Authorization')
@Controller('authorization')
export class AuthorizationController {
	constructor(private readonly authorizationService: AuthorizationService) { }

	@Post('signin')
	@ApiOperation({
		summary: 'Sign in user',
		description: 'Authenticates a user with email and password. Returns user data and session tokens.',
	})
	@ApiBody({
		type: SignInUserDto,
		examples: {
			'b2b-tenant-owner': {
				summary: 'B2B - Tenant Owner',
				description: 'Sign in as a B2B tenant owner',
				value: {
					email: 'tenant_member@yopmail.com',
					password: 'SecurePassword123!',
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'User signed in successfully',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 200 },
				message: { type: 'string', example: 'User signed in successfully' },
				data: {
					type: 'object',
					properties: {
						user: {
							type: 'object',
							properties: {
								id: {
									type: 'string',
									example: '123e4567-e89b-12d3-a456-426614174000',
								},
								email: { type: 'string', example: 'john.doe@example.com' },
								user_metadata: {
									type: 'object',
									example: {
										first_name: 'John',
										last_name: 'Doe',
									},
								},
							},
						},
						session: {
							type: 'object',
							properties: {
								access_token: {
									type: 'string',
									example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
								},
								refresh_token: {
									type: 'string',
									example: 'v1.MRjcMN-R4pPAT...',
								},
								expires_in: { type: 'number', example: 3600 },
								expires_at: { type: 'number', example: 1672531200 },
								token_type: { type: 'string', example: 'bearer' },
							},
						},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - Invalid credentials or input data',
	})
	@HttpCode(HttpStatus.OK)
	async signInUser(@Body() signInUserDto: SignInUserDto) {
		const data = await this.authorizationService.signInUser(signInUserDto);
		return {
			statusCode: HttpStatus.OK,
			message: 'User signed in successfully',
			data,
		};
	}

	@Post('register')
	@ApiOperation({
		summary: 'Register a new user',
		description: 'Creates a new user account with email, phone, and password. Email verification is required.',
	})
	@ApiBody({
		type: RegisterUserDto,
		examples: {
			'register-with-email-and-phone': {
				summary: 'Register with email and phone',
				description: 'Register a new user with email, phone, and password',
				value: {
					first_name: 'John',
					last_name: 'Doe',
					email: 'john.doe@yopmail.com',
					phone: '+19782528401',
					password: 'Password@123',
					confirm_password: 'Password@123',
				},
			},
		},
	})
	@ApiResponse({ status: 201, description: 'User registered successfully' })
	@ApiResponse({
		status: 400,
		description: 'Bad request - Invalid input data, email already exists, or phone number already exists',
	})
	@HttpCode(HttpStatus.CREATED)
	async registerUser(@Body() registerUserDto: RegisterUserDto) {
		const data = await this.authorizationService.registerUser(registerUserDto);
		return {
			statusCode: HttpStatus.CREATED,
			message: 'User registered successfully',
			data,
		};
	}

	@Post('resend-email')
	@ApiOperation({
		summary: 'Resend email confirmation',
		description: 'Resends the email confirmation email to the user',
	})
	@ApiResponse({
		status: 200,
		description: 'Email confirmation email resent successfully',
	})
	@ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
	@HttpCode(HttpStatus.OK)
	async resendEmailConfirmation(@Body() resendEmailConfirmationDto: { email: string }) {
		const data = await this.authorizationService.resendEmailConfirmation(resendEmailConfirmationDto.email);
		return {
			statusCode: HttpStatus.OK,
			message: 'Email confirmation email resent successfully',
			data,
		};
	}

	@Post('forgot-password')
	@ApiOperation({
		summary: 'Forgotten Password Email',
		description: 'Sends the user a login link via email. Once logged in, you should direct the user to a new password form. Use "Update User" to save the new password.',
	})
	@ApiBody({
		type: ForgotPasswordDto,
		examples: {
			'forgot-password': {
				summary: 'Request password reset',
				description: 'Send password reset email to user',
				value: {
					email: 'john.doe@example.com',
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'Password reset email sent successfully',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 200 },
				message: { type: 'string', example: 'Password reset email sent successfully' },
				data: {
					type: 'object',
					properties: {
						message: { type: 'string', example: 'Password reset email sent successfully' },
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - Invalid email address or user not found',
	})
	@HttpCode(HttpStatus.OK)
	async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
		const data = await this.authorizationService.forgotPassword(forgotPasswordDto.email);
		return {
			statusCode: HttpStatus.OK,
			message: 'Password reset email sent successfully',
			data,
		};
	}

	@Post('login-with-otp')
	@ApiOperation({
		summary: 'Login With OTP',
		description: 'Generate a 6-digit OTP code, save it to user metadata along with expiry time, and send it via email. User must exist in the system.',
	})
	@ApiBody({
		type: LoginWithOtpDto,
		examples: {
			'login-with-otp': {
				summary: 'Login with OTP',
				description: 'Generate and send 6-digit OTP code to user email',
				value: {
					email: 'tenant_member@yopmail.com',
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'OTP email sent successfully',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 200 },
				message: { type: 'string', example: 'OTP email sent successfully' },
				data: {
					type: 'object',
					properties: {
						message: { type: 'string', example: 'OTP email sent successfully' },
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - Invalid email address or failed to send email',
	})
	@HttpCode(HttpStatus.OK)
	async loginWithOtp(@Body() loginWithOtpDto: LoginWithOtpDto) {
		const data = await this.authorizationService.loginWithOtp(loginWithOtpDto);
		return {
			statusCode: HttpStatus.OK,
			message: 'OTP email sent successfully',
			data,
		};
	}

	@Post('validate-otp')
	@ApiOperation({
		summary: 'Validate OTP and Sign In',
		description: 'Validates the OTP code, signs in the user, creates a session, and expires the OTP so it cannot be used again.',
	})
	@ApiBody({
		type: VerifyOtpDto,
		examples: {
			'validate-otp': {
				summary: 'Validate OTP and sign in',
				description: 'Validate OTP code and sign in user',
				value: {
					email: 'tenant_member@yopmail.com',
					token: '123456',
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'OTP validated and user signed in successfully',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 200 },
				message: { type: 'string', example: 'OTP validated and user signed in successfully' },
				data: {
					type: 'object',
					properties: {
						user: {
							type: 'object',
							properties: {
								id: {
									type: 'string',
									example: '123e4567-e89b-12d3-a456-426614174000',
								},
								email: { type: 'string', example: 'john.doe@example.com' },
								user_metadata: {
									type: 'object',
									example: {
										first_name: 'John',
										last_name: 'Doe',
									},
								},
							},
						},
						session: {
							type: 'object',
							properties: {
								access_token: {
									type: 'string',
									example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
								},
								refresh_token: {
									type: 'string',
									example: 'v1.MRjcMN-R4pPAT...',
								},
								expires_in: { type: 'number', example: 3600 },
								expires_at: { type: 'number', example: 1672531200 },
								token_type: { type: 'string', example: 'bearer' },
							},
						},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - Invalid OTP, expired OTP, or user not found',
	})
	@HttpCode(HttpStatus.OK)
	async validateOtpAndSignIn(@Body() verifyOtpDto: VerifyOtpDto) {
		const data = await this.authorizationService.validateOtpAndSignIn(verifyOtpDto);
		return {
			statusCode: HttpStatus.OK,
			message: 'OTP validated and user signed in successfully',
			data,
		};
	}

	@Post('verify-otp')
	@ApiOperation({
		summary: 'Verify OTP using Supabase native method',
		description: 'Verifies the OTP code using Supabase\'s native verifyOtp method and returns user session. OTP must be sent via Supabase signInWithOtp first.',
	})
	@ApiBody({
		type: VerifyOtpDto,
		examples: {
			'verify-otp': {
				summary: 'Verify OTP',
				description: 'Verify OTP code using Supabase native method',
				value: {
					email: 'tenant_member@yopmail.com',
					token: '123456',
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'OTP verified and user signed in successfully',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 200 },
				message: { type: 'string', example: 'OTP verified and user signed in successfully' },
				data: {
					type: 'object',
					properties: {
						user: {
							type: 'object',
							properties: {
								id: {
									type: 'string',
									example: '123e4567-e89b-12d3-a456-426614174000',
								},
								email: { type: 'string', example: 'john.doe@example.com' },
								user_metadata: {
									type: 'object',
									example: {
										first_name: 'John',
										last_name: 'Doe',
									},
								},
							},
						},
						session: {
							type: 'object',
							properties: {
								access_token: {
									type: 'string',
									example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
								},
								refresh_token: {
									type: 'string',
									example: 'v1.MRjcMN-R4pPAT...',
								},
								expires_in: { type: 'number', example: 3600 },
								expires_at: { type: 'number', example: 1672531200 },
								token_type: { type: 'string', example: 'bearer' },
							},
						},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - Invalid or expired OTP',
	})
	@HttpCode(HttpStatus.OK)
	async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
		const data = await this.authorizationService.verifyOtp(verifyOtpDto);
		return {
			statusCode: HttpStatus.OK,
			message: 'OTP verified and user signed in successfully',
			data,
		};
	}
}
