import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["applicant", "admin", "judge"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const appStatusEnum = pgEnum("app_status", [
  "draft",
  "pending",
  "shortlisted",
  "approved",
  "rejected",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
  "refunded",
]);
export const sponsorTierEnum = pgEnum("sponsor_tier", [
  "platinum",
  "gold",
  "silver",
  "bronze",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("applicant"),
  status: userStatusEnum("status").notNull().default("active"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailToken: varchar("email_token", { length: 255 }),
  resetToken: varchar("reset_token", { length: 255 }),
  resetExpires: timestamp("reset_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  blogPosts: many(blogPosts),
}));

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  applicationNumber: varchar("application_number", { length: 50 }).notNull().unique(),
  status: appStatusEnum("status").notNull().default("draft"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
  currentStep: integer("current_step").notNull().default(1),

  // Personal information
  title: varchar("title", { length: 20 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  otherNames: varchar("other_names", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: varchar("date_of_birth", { length: 20 }),
  age: integer("age"),
  stateOfOrigin: varchar("state_of_origin", { length: 100 }),
  lga: varchar("lga", { length: 100 }),
  nationality: varchar("nationality", { length: 100 }).default("Nigerian"),
  occupation: varchar("occupation", { length: 100 }),
  city: varchar("city", { length: 100 }),

  // Education
  educationLevel: varchar("education_level", { length: 100 }),
  institution: varchar("institution", { length: 255 }),
  courseOfStudy: varchar("course_of_study", { length: 255 }),
  graduationYear: varchar("graduation_year", { length: 20 }),

  // Pageant profile
  height: varchar("height", { length: 20 }),
  bust: varchar("bust", { length: 20 }),
  waist: varchar("waist", { length: 20 }),
  hips: varchar("hips", { length: 20 }),
  dressSize: varchar("dress_size", { length: 20 }),
  hairColor: varchar("hair_color", { length: 50 }),
  eyeColor: varchar("eye_color", { length: 50 }),
  talents: text("talents"),
  hobbies: text("hobbies"),
  languages: text("languages"),

  // Source & essays
  platformSource: varchar("platform_source", { length: 100 }),
  whyParticipate: text("why_participate"),
  advocacyInterest: text("advocacy_interest"),
  communityProject: text("community_project"),
  leadershipExperience: text("leadership_experience"),
  socialImpact: text("social_impact"),
  careerGoals: text("career_goals"),

  // Emergency contact
  emergencyName: varchar("emergency_name", { length: 100 }),
  emergencyPhone: varchar("emergency_phone", { length: 50 }),
  emergencyRelationship: varchar("emergency_relationship", { length: 50 }),

  // Documents
  idDocumentPath: text("id_document_path"),
  headshotPath: text("headshot_path"),
  fullBodyPath: text("full_body_path"),

  // Agreements
  termsAgreed: boolean("terms_agreed").notNull().default(false),
  consentSigned: boolean("consent_signed").notNull().default(false),

  // Payment
  amountPaid: integer("amount_paid").default(0),
  paymentReference: varchar("payment_reference", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  payments: many(payments),
  scores: many(scores),
}));

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reference: varchar("reference", { length: 255 }).notNull().unique(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
  status: paymentStatusEnum("status").notNull().default("unpaid"),
  channel: varchar("channel", { length: 100 }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  application: one(applications, {
    fields: [payments.applicationId],
    references: [applications.id],
  }),
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const judges = pgTable("judges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  bio: text("bio"),
  photoPath: text("photo_path"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  judgeId: integer("judge_id")
    .notNull()
    .references(() => judges.id, { onDelete: "cascade" }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  criterion: varchar("criterion", { length: 100 }).notNull(),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }),
  entityId: integer("entity_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  imagePath: text("image_path").notNull(),
  category: varchar("category", { length: 100 }),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sponsors = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoPath: text("logo_path"),
  tier: sponsorTierEnum("tier").notNull().default("bronze"),
  website: varchar("website", { length: 255 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoPath: text("logo_path"),
  type: varchar("type", { length: 100 }),
  website: varchar("website", { length: 255 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
