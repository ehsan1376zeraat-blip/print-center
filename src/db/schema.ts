import {
  bigint,
  bigserial,
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    jalaliDate: text("jalali_date").notNull(),
    subtotal: bigint("subtotal", { mode: "number" }).notNull().default(0),
    totalPayments: bigint("total_payments", { mode: "number" }).notNull().default(0),
    previousBalance: bigint("previous_balance", { mode: "number" }).notNull().default(0),
    endBalance: bigint("end_balance", { mode: "number" }).notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("invoices_number_idx").on(table.number)],
);

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  rowType: text("row_type", { enum: ["sale", "payment"] }).notNull().default("sale"),
  description: text("description").notNull(),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull().default("1"),
  unit: text("unit").notNull().default("عدد"),
  unitPrice: bigint("unit_price", { mode: "number" }).notNull().default(0),
  rowTotal: bigint("row_total", { mode: "number" }).notNull().default(0),
  position: integer("position").notNull().default(0),
});

export const ledger = pgTable("ledger", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  jalaliDate: text("jalali_date").notNull(),
  debit: bigint("debit", { mode: "number" }).notNull().default(0),
  credit: bigint("credit", { mode: "number" }).notNull().default(0),
  description: text("description").notNull(),
  refInvoiceId: integer("ref_invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  automatic: boolean("automatic").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type LedgerEntry = typeof ledger.$inferSelect;
