import { bigint, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

const commonColumns = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
};

export const users = pgTable("user", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
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

export type User = typeof users.$inferSelect;
export type UserPoint = typeof userPoints.$inferSelect;
export type Post = typeof posts.$inferSelect;
