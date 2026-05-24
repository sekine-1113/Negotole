import { bigint, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
  userId: bigint("user_id", { mode: "number" }).notNull(),
  getPoint: integer("get_point").notNull(),
  expiresAt: timestamp("expires_at"),
  ...commonColumns,
});

export const posts = pgTable("post", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  content: varchar("content", { length: 255 }).notNull(),
  hiddenAt: timestamp("hidden_at").notNull(),
  ...commonColumns,
});

export const campaigns = pgTable("campaign", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  bonusPoints: integer("bonus_points").notNull().default(100),
  ...commonColumns,
});

export type User = typeof users.$inferSelect;
export type UserPoint = typeof userPoints.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
