"use client";

import { useConfirm } from "@/components/confirm";
import { InvoicePaper } from "@/components/invoice-paper";
import { AmountInput, EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { formatJalali, formatNumber, formatToman, sanitizeJalaliDate, toPersianDigits } from "@/lib/format";
import type { AppData, InvoiceDto, LedgerDto } from "@/lib/types";
import { ArrowDownLeft, ArrowUpRight, BookOpen, CalendarRange, Check, Edit3, Eye, Filter, Landmark, Plus, Printer, ReceiptText, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

type Mutate = (payload: Record<string, unknown>, successMessage?: string) => Promise<Record<string, unknown>>;

export function Ledger({ data, mutate }: { data: AppData; mutate: Mutate }) {
  const [form, setForm] = useState({ customerId: data.customers[0]?.id ?? 0, kind: "debit", amount: 0, jalaliDate: data.today, description: "" });
  const [filter, setFilter] = useState({ customerId: 0, from: "", to: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ jalaliDate: "", description: "", debit: 0, credit: 0 });
  const [preview, setPreview] = useState<InvoiceDto | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const entries = useMemo(() => data.ledger.filter((entry) => {
    if (filter.customerId && entry.customerId !== filter.customerId) return false;
    if (filter.from && entry.jalaliDate < filter.from) return false;
    if (filter.to && entry.jalaliDate > filter.to) return false;
    return true;
  }), [data.ledger, filter]);
  const debitTotal = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const creditTotal = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const previewCustomer = preview ? data.customers.find((customer) => customer.id === preview.customerId) : undefined;

  async function submit() {
    await mutate({ action: "ledger.create", ...form }, "تراکنش در دفتر حساب ثبت شد");
    setForm((current) => ({ ...current, amount: 0, description: "" }));
  }

  function startEdit(entry: LedgerDto) {
    setEditingId(entry.id);
    setEditForm({ jalaliDate: entry.jalaliDate, description: entry.description, debit: entry.debit, credit: entry.credit });
  }

  async function saveEdit() {
    if (!editingId) return;
    await mutate({ action: "ledger.update", id: editingId, ...editForm }, "تراکنش ویرایش شد");
    setEditingId(null);
  }

  async function removeEntry(entry: LedgerDto) {
    if (entry.automatic && entry.refInvoiceId) {
      const invoice = data.invoices.find((item) => item.id === entry.refInvoiceId);
      const ok = await confirm({
        title: "حذف فاکتور",
        message: `فاکتور «${invoice ? toPersianDigits(invoice.number) : ""}» به‌طور کامل حذف شود؟ اقلام فاکتور و تراکنش دفتر حساب هم پاک می‌شوند.`,
        confirmLabel: "حذف فاکتور",
      });
      if (!ok) return;
      await mutate({ action: "invoice.delete", id: entry.refInvoiceId }, "فاکتور حذف شد");
    } else {
      const ok = await confirm({ title: "حذف تراکنش", message: "این تراکنش دستی حذف شود؟" });
      if (!ok) return;
      await mutate({ action: "ledger.delete", id: entry.id }, "تراکنش حذف شد");
    }
  }

  function openPreview(entry: LedgerDto) {
    const invoice = data.invoices.find((item) => item.id === entry.refInvoiceId);
    if (invoice) setPreview(invoice);
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
          <div className="table-wrap"><table className="data-table ledger-table"><thead><tr><th>تاریخ</th><th>مشتری</th><th>شرح تراکنش</th><th>بدهکار (تومان)</th><th>بستانکار (تومان)</th><th>منبع</th><th>عملیات</th></tr></thead><tbody>
            {entries.map((entry) => editingId === entry.id ? (
              <tr className="editing-row" key={entry.id}>
                <td className="edit-cell date-cell"><input value={toPersianDigits(editForm.jalaliDate)} onChange={(event) => setEditForm({ ...editForm, jalaliDate: sanitizeJalaliDate(event.target.value) })} inputMode="numeric" /></td>
                <td><b>{entry.customerName}</b></td>
                <td className="edit-cell desc-cell"><input value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></td>
                <td className="edit-cell"><AmountInput value={editForm.debit} onChange={(value) => setEditForm({ ...editForm, debit: value })} disabled={entry.automatic} /></td>
                <td className="edit-cell"><AmountInput value={editForm.credit} onChange={(value) => setEditForm({ ...editForm, credit: value })} disabled={entry.automatic} /></td>
                <td><small className="edit-hint">{entry.automatic ? "فاکتور" : "دستی"}</small></td>
                <td>
                  <div className="row-actions">
                    <button className="table-action green" title="ذخیره" onClick={saveEdit} disabled={!editForm.description.trim()}><Check size={16} /></button>
                    <button className="table-action" title="انصراف" onClick={() => setEditingId(null)}><X size={16} /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={entry.id}>
                <td>{formatJalali(entry.jalaliDate)}</td><td><b>{entry.customerName}</b></td>
                <td>{entry.description}</td>
                <td>{entry.debit ? <span className="transaction-amount debit"><ArrowUpRight size={14} />{formatToman(entry.debit)}</span> : "—"}</td>
                <td>{entry.credit ? <span className="transaction-amount credit"><ArrowDownLeft size={14} />{formatToman(entry.credit)}</span> : "—"}</td>
                <td>{entry.automatic ? <span className="source-chip"><ReceiptText size={13} /> فاکتور</span> : <span className="source-chip manual"><BookOpen size={13} /> دستی</span>}</td>
                <td>
                  <div className="row-actions">
                    <button className="table-action" title="ویرایش" onClick={() => startEdit(entry)}><Edit3 size={15} /></button>
                    {entry.automatic && entry.refInvoiceId ? <button className="table-action green" title="مشاهده فاکتور" onClick={() => openPreview(entry)}><Eye size={16} /></button> : null}
                    <button className="table-action danger" title={entry.automatic ? "حذف فاکتور" : "حذف تراکنش"} onClick={() => removeEntry(entry)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody></table></div>
        ) : <EmptyState icon={<BookOpen size={28} />} title="تراکنشی در این بازه نیست" text="یک تراکنش دستی ثبت کنید یا فیلترها را تغییر دهید." />}
        {editingId ? <p className="auto-edit-note"><ReceiptText size={14} /> در تراکنش‌های فاکتور فقط تاریخ و شرح قابل ویرایش است؛ برای تغییر مبلغ، فاکتور را حذف و دوباره صادر کنید.</p> : null}
      </section>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={`پیش‌نمایش فاکتور ${preview ? toPersianDigits(preview.number) : ""}`} subtitle="نمای چاپی دقیق روی کاغذ A4" size="xl">
        {preview ? (
          <div className="preview-stage">
            <div className="preview-toolbar"><button className="button button-primary" onClick={() => window.print()}><Printer size={17} /> چاپ / خروجی PDF</button></div>
            <InvoicePaper number={preview.number} date={preview.jalaliDate} customer={previewCustomer} items={preview.items} previousBalance={preview.previousBalance} note={preview.note} settings={data.settings} />
          </div>
        ) : null}
      </Modal>

      {confirmDialog}
    </>
  );
}
