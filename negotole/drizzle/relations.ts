import { relations } from "drizzle-orm/relations";
import { appUser, post, userPoint, campaign, campaignApplication, adminAuditLog, loginLog, report } from "./schema";

export const postRelations = relations(post, ({one, many}) => ({
	appUser: one(appUser, {
		fields: [post.userId],
		references: [appUser.id]
	}),
	reports: many(report),
}));

export const appUserRelations = relations(appUser, ({many}) => ({
	posts: many(post),
	userPoints: many(userPoint),
	campaignApplications: many(campaignApplication),
	adminAuditLogs: many(adminAuditLog),
	loginLogs: many(loginLog),
	reports: many(report),
}));

export const userPointRelations = relations(userPoint, ({one}) => ({
	appUser: one(appUser, {
		fields: [userPoint.userId],
		references: [appUser.id]
	}),
}));

export const campaignApplicationRelations = relations(campaignApplication, ({one}) => ({
	campaign: one(campaign, {
		fields: [campaignApplication.campaignId],
		references: [campaign.id]
	}),
	appUser: one(appUser, {
		fields: [campaignApplication.userId],
		references: [appUser.id]
	}),
}));

export const campaignRelations = relations(campaign, ({many}) => ({
	campaignApplications: many(campaignApplication),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({one}) => ({
	appUser: one(appUser, {
		fields: [adminAuditLog.adminId],
		references: [appUser.id]
	}),
}));

export const loginLogRelations = relations(loginLog, ({one}) => ({
	appUser: one(appUser, {
		fields: [loginLog.userId],
		references: [appUser.id]
	}),
}));

export const reportRelations = relations(report, ({one}) => ({
	post: one(post, {
		fields: [report.postId],
		references: [post.id]
	}),
	appUser: one(appUser, {
		fields: [report.reporterId],
		references: [appUser.id]
	}),
}));