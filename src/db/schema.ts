import {
  pgTable,
  text,
  timestamp,
  decimal,
  boolean,
  uuid,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const billStatusEnum = pgEnum("bill_status", ["paid", "unpaid"]);
export const recurringTypeEnum = pgEnum("recurring_type", [
  "none",
  "daily",
  "weekly",
  "monthly",
]);
export const paymentModeEnum = pgEnum("payment_mode", [
  "cash",
  "upi",
  "cheque",
  "net_banking",
]);
export const billedToEnum = pgEnum("billed_to", [
  "anchal_sweets",
  "anchal_caterers",
  "anchal_caterers_original",
]);

// Users table (synced with Clerk via webhook)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  icon: text("icon").default("Package"),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("categories_user_id_idx").on(t.userId),
]);

// Vendors table (under categories)
export const vendors = pgTable("vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: uuid("category_id")
    .references(() => categories.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("vendors_user_id_category_id_idx").on(t.userId, t.categoryId),
  index("vendors_category_id_idx").on(t.categoryId),
]);

// Bills table
export const bills = pgTable("bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: uuid("category_id")
    .references(() => categories.id, { onDelete: "cascade" })
    .notNull(),
  vendorId: uuid("vendor_id")
    .references(() => vendors.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  // R2 object key, e.g. bills/<userId>/<uuid>.jpg — the image itself lives in the private R2 bucket
  imageKey: text("image_key"),
  status: billStatusEnum("status").default("unpaid").notNull(),
  paymentMode: paymentModeEnum("payment_mode"),
  billedTo: billedToEnum("billed_to"),
  invoiceNumber: text("invoice_number"),
  receivedDate: timestamp("received_date").notNull(),
  paidDate: timestamp("paid_date"),
  dueDate: timestamp("due_date"),
  isRecurring: recurringTypeEnum("is_recurring").default("none").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  // Bills list (newest uploads first)
  index("bills_user_id_created_at_idx").on(t.userId, t.createdAt.desc()),
  // Stats / date-range filters
  index("bills_user_id_received_date_idx").on(t.userId, t.receivedDate),
  // Category detail page + cascade deletes
  index("bills_category_id_idx").on(t.categoryId),
  // ON DELETE SET NULL when a vendor is deleted
  index("bills_vendor_id_idx").on(t.vendorId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  vendors: many(vendors),
  bills: many(bills),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  vendors: many(vendors),
  bills: many(bills),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [vendors.categoryId],
    references: [categories.id],
  }),
  bills: many(bills),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  user: one(users, {
    fields: [bills.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [bills.categoryId],
    references: [categories.id],
  }),
  vendor: one(vendors, {
    fields: [bills.vendorId],
    references: [vendors.id],
  }),
}));

// Types inferred from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;