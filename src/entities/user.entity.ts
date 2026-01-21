import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users', { schema: 'auth', synchronize: false })
@Index(['email'])
@Index(['phone'])
export class User {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@Column({ type: 'varchar', nullable: true })
	email: string | null;

	@Column({ type: 'varchar', nullable: true })
	phone: string | null;

	@Column({ type: 'jsonb', nullable: true, name: 'raw_user_meta_data' })
	user_metadata: Record<string, any> | null;

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
	updated_at: Date;
}
