import { pgTable, index, foreignKey, bigint, varchar, timestamp, integer, unique, text, uniqueIndex, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const post = pgTable("post", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "post_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	content: varchar({ length: 255 }).notNull(),
	hiddenAt: timestamp("hidden_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	index("post_hidden_at_idx").using("btree", table.hiddenAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [appUser.id],
			name: "post_user_id_app_user_id_fk"
		}).onDelete("cascade"),
]);

export const userPoint = pgTable("user_point", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "user_point_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	getPoint: integer("get_point").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	index("user_point_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("user_point_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [appUser.id],
			name: "user_point_user_id_app_user_id_fk"
		}).onDelete("cascade"),
]);

export const appUser = pgTable("app_user", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "user_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: varchar({ length: 255 }).notNull(),
	birthYear: integer("birth_year").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	email: varchar({ length: 255 }),
	role: varchar({ length: 20 }).default('user').notNull(),
	bannedAt: timestamp("banned_at", { mode: 'string' }),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const campaign = pgTable("campaign", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "campaign_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	startsAt: timestamp("starts_at", { mode: 'string' }).notNull(),
	endsAt: timestamp("ends_at", { mode: 'string' }).notNull(),
	bonusPoints: integer("bonus_points").default(100).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	pointsType: varchar("points_type", { length: 20 }).default('permanent').notNull(),
}, (table) => [
	index("campaign_starts_ends_idx").using("btree", table.startsAt.asc().nullsLast().op("timestamp_ops"), table.endsAt.asc().nullsLast().op("timestamp_ops")),
]);

export const campaignApplication = pgTable("campaign_application", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "campaign_application_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	campaignId: bigint("campaign_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("campaign_application_campaign_user_idx").using("btree", table.campaignId.asc().nullsLast().op("int8_ops"), table.userId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaign.id],
			name: "campaign_application_campaign_id_campaign_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [appUser.id],
			name: "campaign_application_user_id_app_user_id_fk"
		}).onDelete("cascade"),
]);

export const adminAuditLog = pgTable("admin_audit_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "admin_audit_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	adminId: bigint("admin_id", { mode: "number" }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	targetType: varchar("target_type", { length: 30 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	targetId: bigint("target_id", { mode: "number" }),
	payload: json(),
	ipAddress: varchar("ip_address", { length: 45 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("admin_audit_log_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("admin_audit_log_admin_id_idx").using("btree", table.adminId.asc().nullsLast().op("int8_ops")),
	index("admin_audit_log_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [appUser.id],
			name: "admin_audit_log_admin_id_app_user_id_fk"
		}).onDelete("cascade"),
]);

export const loginLog = pgTable("login_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "login_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("login_log_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [appUser.id],
			name: "login_log_user_id_app_user_id_fk"
		}).onDelete("cascade"),
]);

export const report = pgTable("report", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "report_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	postId: bigint("post_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reporterId: bigint("reporter_id", { mode: "number" }),
	reason: varchar({ length: 255 }).notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("report_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("report_post_id_idx").using("btree", table.postId.asc().nullsLast().op("int8_ops")),
	uniqueIndex("report_post_reporter_uidx").using("btree", table.postId.asc().nullsLast().op("int8_ops"), table.reporterId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "report_post_id_post_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [appUser.id],
			name: "report_reporter_id_app_user_id_fk"
		}).onDelete("set null"),
]);
