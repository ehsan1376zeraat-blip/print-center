"use client";

import { AmountInput, EmptyState, Field, PageHeader } from "@/components/ui";
import { formatJalali, formatNumber, formatToman, sanitizeJalaliDate, toPersianDigits } from "@/lib/format";
import type { AppData } from "@/lib/types";
import { ArrowDownLeft, ArrowUpRight, BookOpen, CalendarRange, Filter, Landmark, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type Mutate = (payload: Record<string, unknown>, successMessage?: string) => Promise<Record<string, unknown>>;

export function Ledger({ data, mutate }: { data: AppData; mutate: Mutate }) {
  const [form, setForm] = useState({ customerId: data.customers[0]?.id ?? 0, kind: "debit", amount: 0, jalaliDate: data.today, description: "" });
  const [filter, setFilter] = useState({ customerId: 0, from: "", to: "" });

  const entries = useMemo(() => data.ledger.filter((entry) => {
    if (filter.customerId && entry.customerId !== filter.customerId) return false;
    if (filter.from && entry.jalaliDate < filter.from) return false;
    if (filter.to && entry.jalaliDate > filter.to) return false;
    return true;
  }), [data.ledger, filter]);
  const debitTotal = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const creditTotal = entries.reduce((sum, entry) => sum + entry.credit, 0);

  async function submit() {
    await mutate({ action: "ledger.create", ...form }, "تراکنش در دفتر حساب ثبت شد");
    setForm((current) => ({ ...current, amount: 0, description: "" }));
  }

  async function remove(id: number) {
    if (!window.confirm("این تراکنش دستی حذف شود؟")) return;
    await mutate({ action: "ledger.delete", id }, "تراکنش حذف شد");
  }

  return (
    <>
      <PageHeader title="دفتر حساب" description="ثبت و پیگیری تمام بدهکاری‌ها و بستانکاری‌های مشتریان" />

      <section className="card ledger-entry-card">
        <div className="section-title"><span className="section-title-icon"><Plus size={19} /></span><div><h2>ثبت تراکنش دستی</h2><p>خرید نسیه یا دریافت وجه خارج از فاکتور را ثبت کنید</p></div></div>
        <div className="ledger-form-grid">
          <Field label="مشتری">
            <select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: Number(event.target.value) })}><option value={0}>انتخاب مشتری</option>{data.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select>
          </Field>
          <Field label="نوع تراکنش">
            <div className="segmented">
              <button className={form.kind === "debit" ? "active debit" : ""} onClick={() => setForm({ ...form, kind: "debit" })} type="button"><ArrowUpRight size={16} /> بدهکار</button>
              <button className={form.kind === "credit" ? "active credit" : ""} onClick={() => setForm({ ...form, kind: "credit" })} type="button"><ArrowDownLeft size={16} /> بستانکار</button>
            </div>
          </Field>
          <Field label="مبلغ (تومان)"><AmountInput value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} /></Field>
          <Field label="تاریخ شمسی"><input value={toPersianDigits(form.jalaliDate)} onChange={(event) => setForm({ ...form, jalaliDate: sanitizeJalaliDate(event.target.value) })} inputMode="numeric" /></Field>
          <Field label="شرح تراکنش" wide><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="مثلاً: واریز کارت‌به‌کارت" /></Field>
          <button className="button button-primary ledger-submit" onClick={submit} disabled={!form.customerId || !form.amount || !form.description.trim()}><Landmark size={18} /> ثبت تراکنش</button>
        </div>
      </section>

      <section className="card ledger-history-card">
        <div className="card-heading ledger-heading"><div><h2>تاریخچه تراکنش‌ها</h2><p>{formatNumber(entries.length)} رویداد مالی</p></div><div className="ledger-totals"><span>بدهکار: <b className="text-danger">{formatToman(debitTotal)}</b></span><span>بستانکار: <b className="text-success">{formatToman(creditTotal)}</b></span></div></div>
        <div className="filter-bar">
          <span className="filter-label"><Filter size={16} /> فیلترها</span>
          <select value={filter.customerId} onChange={(event) => setFilter({ ...filter, customerId: Number(event.target.value) })}><option value={0}>همه مشتریان</option>{data.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select>
          <label><CalendarRange size={15} /><input value={toPersianDigits(filter.from)} onChange={(event) => setFilter({ ...filter, from: sanitizeJalaliDate(event.target.value) })} placeholder="از تاریخ" /></label>
          <label><CalendarRange size={15} /><input value={toPersianDigits(filter.to)} onChange={(event) => setFilter({ ...filter, to: sanitizeJalaliDate(event.target.value) })} placeholder="تا تاریخ" /></label>
          {(filter.customerId || filter.from || filter.to) ? <button className="text-button" onClick={() => setFilter({ customerId: 0, from: "", to: "" })}>پاک کردن فیلتر</button> : null}
        </div>

        {entries.length ? (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>تاریخ</th><th>مشتری</th><th>شرح تراکنش</th><th>بدهکار (تومان)</th><th>بستانکار (تومان)</th><th>منبع</th><th /></tr></thead><tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatJalali(entry.jalaliDate)}</td><td><b>{entry.customerName}</b></td>
                <td>{entry.description}</td>
                <td>{entry.debit ? <span className="transaction-amount debit"><ArrowUpRight size={14} />{formatToman(entry.debit)}</span> : "—"}</td>
                <td>{entry.credit ? <span className="transaction-amount credit"><ArrowDownLeft size={14} />{formatToman(entry.credit)}</span> : "—"}</td>
                <td>{entry.automatic ? <span className="source-chip"><ReceiptText size={13} /> فاکتور</span> : <span className="source-chip manual"><BookOpen size={13} /> دستی</span>}</td>
                <td>{!entry.automatic ? <button className="table-action danger" onClick={() => remove(entry.id)} title="حذف"><Trash2 size={16} /></button> : null}</td>
              </tr>
            ))}
          </tbody></table></div>
        ) : <EmptyState icon={<BookOpen size={28} />} title="تراکنشی در این بازه نیست" text="یک تراکنش دستی ثبت کنید یا فیلترها را تغییر دهید." />}
      </section>
    </>
  );
}
