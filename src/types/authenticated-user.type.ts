export type AuthenticatedUser = {
	id: string;
	email?: string | null;
	phone?: string | null;
	metadata?: Record<string, unknown>;
	isSuperAdmin?: boolean;
};
