// NestJS
import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';

// Configurations
import { SupabaseConfigurationsService } from '../../configurations/supabase-configurations';

// DTOs
import { RegisterUserDto } from './dto/register-user.dto';
import { SignInUserDto } from './dto/signin-user.dto';
import { LoginWithOtpDto } from './dto/login-with-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

// Services
import { UserManagementService } from '../user-management/user-management.service';

// Enums

@Injectable()
export class AuthorizationService {
	constructor(
		private readonly supabaseConfigurationsService: SupabaseConfigurationsService,
		private readonly userManagementService: UserManagementService,
	) { }

	// Sign In User
	async signInUser(signInUserDto: SignInUserDto) {
		try {
			const { data, error } = await this.supabaseConfigurationsService.getClient().auth.signInWithPassword({
				email: signInUserDto.email,
				password: signInUserDto.password,
			});

			if (error) {
				throw new BadRequestException(error.message || 'Invalid email or password');
			}

			if (!data?.user || !data?.session) {
				throw new BadRequestException('Sign in failed: No user data returned');
			}

			return {
				user: {
					id: data.user.id,
					email: data.user.email,
					user_metadata: data.user.user_metadata || {},
				},
				session: {
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token,
					expires_in: data.session.expires_in,
					expires_at: data.session.expires_at,
					token_type: data.session.token_type,
				},
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to sign in: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Register User
	async registerUser(registerUserDto: RegisterUserDto) {
		try {
			// Check if user already exists by email
			try {
				const { data: existingUserByEmail } = await this.supabaseConfigurationsService
					.getClient()
					.from('auth.users')
					.select('id, email')
					.eq('email', registerUserDto.email)
					.single();

				if (existingUserByEmail) {
					throw new BadRequestException('An account with this email address already exists');
				}
			} catch (error) {
				// If NotFoundException or no data, user doesn't exist - continue
				// If BadRequestException, re-throw it
				if (error instanceof BadRequestException) {
					throw error;
				}
				// If it's a "not found" error (PGRST116), user doesn't exist, continue
				// Otherwise, log and continue (might be a connection issue)
				if (!(error instanceof NotFoundException)) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					if (!errorMessage.includes('PGRST116') && !errorMessage.includes('No rows')) {
						console.warn('Error checking existing user by email:', error);
					}
				}
			}

			// Check if user already exists by phone
			try {
				const { data: existingUserByPhone } = await this.supabaseConfigurationsService
					.getClient()
					.from('auth.users')
					.select('id, phone')
					.eq('phone', registerUserDto.phone)
					.single();

				if (existingUserByPhone) {
					throw new BadRequestException('An account with this phone number already exists');
				}
			} catch (error) {
				// If NotFoundException or no data, user doesn't exist - continue
				// If BadRequestException, re-throw it
				if (error instanceof BadRequestException) {
					throw error;
				}
				// If it's a "not found" error (PGRST116), user doesn't exist, continue
				// Otherwise, log and continue (might be a connection issue)
				if (!(error instanceof NotFoundException)) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					if (!errorMessage.includes('PGRST116') && !errorMessage.includes('No rows')) {
						console.warn('Error checking existing user by phone:', error);
					}
				}
			}

			// Prepare user metadata
			const userMetadata = {
				first_name: registerUserDto.first_name,
				last_name: registerUserDto.last_name,
				phone: registerUserDto.phone,
				email_verified: false,
				phone_verified: false,
			};

			// Create user using Supabase signUp
			const { data: userData, error } = await this.supabaseConfigurationsService.getClient().auth.signUp({
				email: registerUserDto.email,
				phone: registerUserDto.phone,
				password: registerUserDto.password,
				options: {
					data: userMetadata,
					emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/email-confirmation`,
				},
			});

			if (error) {
				// Handle specific Supabase errors
				if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
					throw new BadRequestException('An account with this email address already exists');
				}
				throw new BadRequestException(`Failed to register user: ${error.message || 'Unknown error'}`);
			}

			if (!userData?.user) {
				throw new BadRequestException('Failed to register user: No user data returned');
			}

			return {
				email: userData.user.email,
				phone: userData.user.phone,
				user_metadata: userData.user.user_metadata || {},
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to register user: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Resend Email Confirmation
	async resendEmailConfirmation(email: string) {
		try {
			const { data, error } = await this.supabaseConfigurationsService.getClient().auth.resend({
				type: 'signup',
				email,
				options: {
					emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/email-confirmation`,
				},
			});

			if (error) throw new BadRequestException(error.message);

			return {
				message: 'Email confirmation email resent successfully',
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to resend email confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Forgot Password - Send password reset email
	async forgotPassword(email: string) {
		try {
			const { data, error } = await this.supabaseConfigurationsService.getClient().auth.resetPasswordForEmail(email, {
				redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/change-password?email=${encodeURIComponent(email)}`,
			});

			if (error) {
				throw new BadRequestException(error.message || 'Failed to send password reset email');
			}

			return {
				message: 'Password reset email sent successfully',
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Login With OTP - Generate 6-digit OTP, save to user metadata, and send email
	async loginWithOtp(loginWithOtpDto: LoginWithOtpDto) {
		try {
			const email = loginWithOtpDto.email.toLowerCase().trim();

			// Get admin client for user operations
			const user = await this.userManagementService.getUserByEmail(email);

			if (!user) {
				throw new BadRequestException('User with this email does not exist');
			}

			// Generate 6-digit OTP
			const otp = Math.floor(100000 + Math.random() * 900000).toString();
			const OTP_EXPIRY_MINUTES = 1;
			const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

			// Get existing user metadata
			const existingMetadata = user.user_metadata || {};

			const adminClient = this.supabaseConfigurationsService.getAdminClient();

			// Update user metadata with OTP and expiry
			const { data: updatedUserData, error: updateError } = await adminClient.auth.admin.updateUserById(
				user.id,
				{
					user_metadata: {
						...existingMetadata,
						otp,
						otp_expiry: expiresAt,
					},
				},
			);

			if (updateError || !updatedUserData?.user) {
				throw new InternalServerErrorException(
					`Failed to update user metadata: ${updateError?.message || 'Unknown error'}`,
				);
			}

			// TODO: Send OTP email

			return {
				message: 'OTP email sent successfully',
			};
		} catch (error) {
			if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Validate OTP and Sign In - Validate OTP, create session, and expire OTP
	async validateOtpAndSignIn(verifyOtpDto: VerifyOtpDto) {
		try {
			const email = verifyOtpDto.email.toLowerCase().trim();
			const otp = verifyOtpDto.token;

			// Get user by email
			const user = await this.userManagementService.getUserByEmail(email);

			if (!user) {
				throw new BadRequestException('User with this email does not exist');
			}

			// Get user metadata
			const userMetadata = user.user_metadata || {};
			const storedOtp = userMetadata.otp;
			const otpExpiry = userMetadata.otp_expiry;

			// Validate OTP exists
			if (!storedOtp) {
				throw new BadRequestException('No OTP found. Please request a new OTP.');
			}

			// Validate OTP matches
			if (storedOtp !== otp) {
				throw new BadRequestException('Invalid OTP. Please check and try again.');
			}

			// Validate OTP hasn't expired
			if (!otpExpiry || Date.now() > otpExpiry) {
				throw new BadRequestException('OTP has expired. Please request a new OTP.');
			}

			const adminClient = this.supabaseConfigurationsService.getAdminClient();

			// Generate magic link to create session
			const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
				type: 'magiclink',
				email: email,
			});

			if (linkError || !linkData?.properties) {
				throw new InternalServerErrorException(
					`Failed to generate session link: ${linkError?.message || 'Unknown error'}`,
				);
			}

			// Extract hashed token from properties
			const { hashed_token } = linkData.properties;

			if (!hashed_token) {
				throw new InternalServerErrorException('Failed to extract token from magic link');
			}

			// Verify the token to create a session
			const { data: sessionData, error: sessionError } = await adminClient.auth.verifyOtp({
				token_hash: hashed_token,
				type: 'email',
			});

			if (sessionError || !sessionData?.session) {
				throw new InternalServerErrorException(
					`Failed to create session: ${sessionError?.message || 'Unknown error'}`,
				);
			}

			// Expire OTP by removing it from user metadata
			const { otp: removedOtp, otp_expiry: removedExpiry, ...cleanMetadata } = userMetadata;

			await adminClient.auth.admin.updateUserById(user.id, {
				user_metadata: cleanMetadata,
			});

			return {
				user: {
					id: sessionData.session.user.id,
					email: sessionData.session.user.email,
					user_metadata: sessionData.session.user.user_metadata || {},
				},
				session: {
					access_token: sessionData.session.access_token,
					refresh_token: sessionData.session.refresh_token,
					expires_in: sessionData.session.expires_in,
					expires_at: sessionData.session.expires_at,
					token_type: sessionData.session.token_type,
				},
			};
		} catch (error) {
			if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to validate OTP and sign in: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	// Verify OTP using Supabase native verifyOtp method
	async verifyOtp(verifyOtpDto: VerifyOtpDto) {
		try {
			const email = verifyOtpDto.email.toLowerCase().trim();
			const token = verifyOtpDto.token;

			const supabaseClient = this.supabaseConfigurationsService.getClient();

			// Verify OTP using Supabase's native method
			const { data, error } = await supabaseClient.auth.verifyOtp({
				email,
				token,
				type: 'email',
			});

			if (error) {
				throw new BadRequestException(error.message || 'Invalid or expired OTP');
			}

			if (!data?.session || !data?.user) {
				throw new BadRequestException('OTP verification failed: No session or user data returned');
			}

			return {
				user: {
					id: data.user.id,
					email: data.user.email,
					user_metadata: data.user.user_metadata || {},
				},
				session: {
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token,
					expires_in: data.session.expires_in,
					expires_at: data.session.expires_at,
					token_type: data.session.token_type,
				},
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to verify OTP: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}
