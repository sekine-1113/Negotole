import { bigint, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

const commonColumns = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
};

export const users = pgTable("app_user", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  birthYear: integer("birth_year").notNull().default(0),
  ...commonColumns,
});

export const userPoints = pgTable("user_point", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  getPoint: integer("get_point").notNull(),
  expiresAt: timestamp("expires_at"),
  ...commonColumns,
}, (t) => [
  index("user_point_user_id_idx").on(t.userId),
  index("user_point_expires_at_idx").on(t.expiresAt),
]);

export const posts = pgTable("post", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  content: varchar("content", { length: 255 }).notNull(),
  hiddenAt: timestamp("hidden_at").notNull(),
  ...commonColumns,
}, (t) => [
  index("post_hidden_at_idx").on(t.hiddenAt),
]);

export const campaigns = pgTable("campaign", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  bonusPoints: integer("bonus_points").notNull().default(100),
  pointsType: varchar("points_type", { length: 20 }).notNull().default("permanent"),
  ...commonColumns,
}, (t) => [
  index("campaign_starts_ends_idx").on(t.startsAt, t.endsAt),
]);

export const campaignApplications = pgTable("campaign_application", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("campaign_application_campaign_user_idx").on(t.campaignId, t.userId),
]);

export type User = typeof users.$inferSelect;
export type UserPoint = typeof userPoints.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignApplication = typeof campaignApplications.$inferSelect;
