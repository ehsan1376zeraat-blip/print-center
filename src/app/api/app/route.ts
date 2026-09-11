import { db } from "@/db";
import { customers, invoiceItems, invoices, ledger, settings } from "@/db/schema";
import { jalaliYear, todayJalali } from "@/lib/format";
import { defaultSettings, type BusinessSettings, type InvoiceItemDto } from "@/lib/types";
import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function message(error: unknown) {
  return error instanceof Error ? error.message : "خطای پیش‌بینی‌نشده";
}

function asInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getNextInvoiceNumber(year = jalaliYear()) {
  const rows = await db.select({ number: invoices.number }).from(invoices).orderBy(desc(invoices.id));
  const maximum = rows.reduce((result, row) => {
    const match = row.number.match(new RegExp(`^${year}-(\\d+)$`));
    return match ? Math.max(result, Number(match[1])) : result;
  }, 0);
  return `${year}-${String(maximum + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const [settingRows, customerRows, invoiceRows, itemRows, ledgerRows] = await Promise.all([
      db.select().from(settings),
      db.select().from(customers).orderBy(desc(customers.createdAt)),
      db
        .select({
          id: invoices.id,
          number: invoices.number,
          customerId: invoices.customerId,
          customerName: customers.name,
          customerPhone: customers.phone,
          jalaliDate: invoices.jalaliDate,
          subtotal: invoices.subtotal,
          totalPayments: invoices.totalPayments,
          previousBalance: invoices.previousBalance,
          endBalance: invoices.endBalance,
          note: invoices.note,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .innerJoin(customers, eq(invoices.customerId, customers.id))
        .orderBy(desc(invoices.id)),
      db.select().from(invoiceItems).orderBy(asc(invoiceItems.position)),
      db
        .select({
          id: ledger.id,
          customerId: ledger.customerId,
          customerName: customers.name,
          jalaliDate: ledger.jalaliDate,
          debit: ledger.debit,
          credit: ledger.credit,
          description: ledger.description,
          refInvoiceId: ledger.refInvoiceId,
          automatic: ledger.automatic,
          createdAt: ledger.createdAt,
        })
        .from(ledger)
        .innerJoin(customers, eq(ledger.customerId, customers.id))
        .orderBy(desc(ledger.id)),
    ]);

    const savedSettings = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
    const businessSettings: BusinessSettings = {
      ...defaultSettings,
      ...savedSettings,
      theme: savedSettings.theme === "dark" ? "dark" : "light",
    };

    const balances = new Map<number, number>();
    for (const entry of ledgerRows) {
      balances.set(entry.customerId, (balances.get(entry.customerId) ?? 0) + Number(entry.debit) - Number(entry.credit));
    }

    const itemMap = new Map<number, InvoiceItemDto[]>();
    for (const item of itemRows) {
      const collection = itemMap.get(item.invoiceId) ?? [];
      collection.push({
        id: item.id,
        invoiceId: item.invoiceId,
        rowType: item.rowType,
        description: item.description,
        qty: Number(item.qty),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        rowTotal: Number(item.rowTotal),
        position: item.position,
      });
      itemMap.set(item.invoiceId, collection);
    }

    const today = todayJalali();
    const currentMonth = today.slice(0, 7);
    const mappedInvoices = invoiceRows.map((invoice) => ({
      ...invoice,
      subtotal: Number(invoice.subtotal),
      totalPayments: Number(invoice.totalPayments),
      previousBalance: Number(invoice.previousBalance),
      endBalance: Number(invoice.endBalance),
      createdAt: invoice.createdAt.toISOString(),
      items: itemMap.get(invoice.id) ?? [],
    }));
    const mappedCustomers = customerRows.map((customer) => ({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
      balance: balances.get(customer.id) ?? 0,
    }));
    const mappedLedger = ledgerRows.map((entry) => ({
      ...entry,
      debit: Number(entry.debit),
      credit: Number(entry.credit),
      createdAt: entry.createdAt.toISOString(),
    }));

    return NextResponse.json({
      customers: mappedCustomers,
      invoices: mappedInvoices,
      ledger: mappedLedger,
      settings: businessSettings,
      stats: {
        todaySales: mappedInvoices.filter((invoice) => invoice.jalaliDate === today).reduce((sum, invoice) => sum + invoice.subtotal, 0),
        monthSales: mappedInvoices.filter((invoice) => invoice.jalaliDate.startsWith(currentMonth)).reduce((sum, invoice) => sum + invoice.subtotal, 0),
        customerCount: mappedCustomers.length,
        totalReceivables: mappedCustomers.reduce((sum, customer) => sum + Math.max(0, customer.balance), 0),
      },
      nextInvoiceNumber: await getNextInvoiceNumber(),
      today,
    });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "customer.create") {
      const name = asText(body.name);
      if (!name) return NextResponse.json({ error: "نام مشتری الزامی است." }, { status: 400 });
      const [created] = await db
        .insert(customers)
        .values({ name, phone: asText(body.phone), note: asText(body.note) })
        .returning();
      return NextResponse.json({ ok: true, id: created.id });
    }

    if (action === "customer.update") {
      const id = asInt(body.id);
      const name = asText(body.name);
      if (!id || !name) return NextResponse.json({ error: "اطلاعات مشتری کامل نیست." }, { status: 400 });
      await db.update(customers).set({ name, phone: asText(body.phone), note: asText(body.note) }).where(eq(customers.id, id));
      return NextResponse.json({ ok: true });
    }

    if (action === "customer.delete") {
      const id = asInt(body.id);
      const related = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.customerId, id)).limit(1);
      if (related.length) return NextResponse.json({ error: "این مشتری دارای فاکتور است و قابل حذف نیست." }, { status: 409 });
      await db.delete(customers).where(eq(customers.id, id));
      return NextResponse.json({ ok: true });
    }

    if (action === "invoice.create") {
      const customerId = asInt(body.customerId);
      const jalaliDate = asText(body.jalaliDate) || todayJalali();
      const rawItems = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
      const cleanItems = rawItems
        .map((item, position) => {
          const rowType: "sale" | "payment" = item.rowType === "payment" ? "payment" : "sale";
          const qty = rowType === "payment" ? 1 : Math.max(0.01, Number(item.qty) || 1);
          const unitPrice = asInt(item.unitPrice);
          return {
            rowType,
            description: asText(item.description) || (rowType === "payment" ? "واریزی مشتری" : ""),
            qty,
            unit: rowType === "payment" ? "—" : asText(item.unit) || "عدد",
            unitPrice,
            rowTotal: rowType === "payment" ? unitPrice : Math.round(qty * unitPrice),
            position,
          };
        })
        .filter((item) => item.description && item.rowTotal > 0);
      if (!customerId) return NextResponse.json({ error: "ابتدا مشتری را انتخاب کنید." }, { status: 400 });
      if (!cleanItems.length) return NextResponse.json({ error: "حداقل یک ردیف معتبر وارد کنید." }, { status: 400 });

      const result = await db.transaction(async (tx) => {
        const customerExists = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
        if (!customerExists.length) throw new Error("مشتری انتخاب‌شده پیدا نشد.");
        const previousEntries = await tx
          .select({ debit: ledger.debit, credit: ledger.credit })
          .from(ledger)
          .where(eq(ledger.customerId, customerId));
        const previousBalance = previousEntries.reduce((sum, entry) => sum + Number(entry.debit) - Number(entry.credit), 0);
        const subtotal = cleanItems.filter((item) => item.rowType === "sale").reduce((sum, item) => sum + item.rowTotal, 0);
        const totalPayments = cleanItems.filter((item) => item.rowType === "payment").reduce((sum, item) => sum + item.rowTotal, 0);
        const number = await getNextInvoiceNumber(jalaliDate.slice(0, 4) || jalaliYear());
        const [created] = await tx
          .insert(invoices)
          .values({
            number,
            customerId,
            jalaliDate,
            subtotal,
            totalPayments,
            previousBalance,
            endBalance: previousBalance + subtotal - totalPayments,
            note: asText(body.note),
          })
          .returning({ id: invoices.id, number: invoices.number });
        await tx.insert(invoiceItems).values(cleanItems.map((item) => ({ ...item, invoiceId: created.id, qty: String(item.qty) })));
        await tx.insert(ledger).values({
          customerId,
          jalaliDate,
          debit: subtotal,
          credit: totalPayments,
          description: `فاکتور شماره ${number}`,
          refInvoiceId: created.id,
          automatic: true,
        });
        return created;
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "invoice.delete") {
      const id = asInt(body.id);
      await db.transaction(async (tx) => {
        await tx.delete(ledger).where(and(eq(ledger.refInvoiceId, id), eq(ledger.automatic, true)));
        await tx.delete(invoices).where(eq(invoices.id, id));
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "ledger.create") {
      const customerId = asInt(body.customerId);
      const kind = body.kind === "credit" ? "credit" : "debit";
      const amount = asInt(body.amount);
      const description = asText(body.description);
      if (!customerId || !amount || !description) {
        return NextResponse.json({ error: "مشتری، مبلغ و شرح تراکنش الزامی است." }, { status: 400 });
      }
      await db.insert(ledger).values({
        customerId,
        jalaliDate: asText(body.jalaliDate) || todayJalali(),
        debit: kind === "debit" ? amount : 0,
        credit: kind === "credit" ? amount : 0,
        description,
        automatic: false,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "ledger.update") {
      const id = asInt(body.id);
      const description = asText(body.description);
      const jalaliDate = asText(body.jalaliDate) || todayJalali();
      if (!id || !description) {
        return NextResponse.json({ error: "شرح تراکنش الزامی است." }, { status: 400 });
      }
      const existing = await db.select().from(ledger).where(eq(ledger.id, id)).limit(1);
      if (!existing.length) return NextResponse.json({ error: "تراکنش پیدا نشد." }, { status: 404 });
      if (existing[0].automatic) {
        await db.update(ledger).set({ jalaliDate, description }).where(eq(ledger.id, id));
      } else {
        const debit = asInt(body.debit);
        const credit = asInt(body.credit);
        if (!debit && !credit) {
          return NextResponse.json({ error: "مبلغ بدهکار یا بستانکار را وارد کنید." }, { status: 400 });
        }
        await db.update(ledger).set({ jalaliDate, description, debit, credit }).where(eq(ledger.id, id));
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "ledger.delete") {
      const id = asInt(body.id);
      const rows = await db.select({ automatic: ledger.automatic }).from(ledger).where(eq(ledger.id, id)).limit(1);
      if (rows[0]?.automatic) return NextResponse.json({ error: "تراکنش خودکار فقط با حذف فاکتور حذف می‌شود." }, { status: 409 });
      await db.delete(ledger).where(eq(ledger.id, id));
      return NextResponse.json({ ok: true });
    }

    if (action === "settings.update") {
      const incoming = (body.settings ?? {}) as Record<string, unknown>;
      const allowed: Array<keyof BusinessSettings> = [
        "businessName",
        "phone",
        "address",
        "cardNumber",
        "footer",
        "theme",
        "primary",
        "backupPath",
        "logo",
      ];
      await db.transaction(async (tx) => {
        for (const key of allowed) {
          const value = asText(incoming[key]);
          await tx
            .insert(settings)
            .values({ key, value })
            .onConflictDoUpdate({ target: settings.key, set: { value } });
        }
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "backup.mark") {
      await db
        .insert(settings)
        .values({ key: "lastBackup", value: new Date().toISOString() })
        .onConflictDoUpdate({ target: settings.key, set: { value: new Date().toISOString() } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "عملیات ناشناخته است." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}
