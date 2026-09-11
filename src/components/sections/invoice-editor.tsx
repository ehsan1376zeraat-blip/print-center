"use client";

import { InvoicePaper } from "@/components/invoice-paper";
import { AmountInput, Field, Modal, PageHeader } from "@/components/ui";
import {
  formatNumber,
  formatToman,
  numberToPersianWords,
  parseQty,
  sanitizeJalaliDate,
  sanitizeQtyInput,
  toPersianDigits,
} from "@/lib/format";
import type { AppData, InvoiceItemDto } from "@/lib/types";
import {
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Eye,
  FileDown,
  FilePlus2,
  Plus,
  Printer,
  Save,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type EditorRow = InvoiceItemDto & { qtyText: string };
const emptyRow = (): EditorRow => ({ rowType: "sale", description: "", qty: 1, qtyText: "۱", unit: "برگ", unitPrice: 0, rowTotal: 0 });
const unitOptions = ["صفحه", "برگ", "نسخه", "عدد", "جلد", "متر", "کارت", "بسته"];

type Mutate = (payload: Record<string, unknown>, successMessage?: string) => Promise<Record<string, unknown>>;

export function InvoiceEditor({ data, mutate }: { data: AppData; mutate: Mutate }) {
  const [customerId, setCustomerId] = useState<number>(data.customers[0]?.id ?? 0);
  const [date, setDate] = useState(data.today);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<EditorRow[]>([emptyRow()]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customerModal, setCustomerModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", note: "" });

  useEffect(() => {
    if (!customerId && data.customers[0]) setCustomerId(data.customers[0].id);
  }, [customerId, data.customers]);

  const customer = data.customers.find((item) => item.id === customerId);
  const previousBalance = customer?.balance ?? 0;
  const subtotal = useMemo(() => rows.filter((row) => row.rowType === "sale").reduce((sum, row) => sum + row.rowTotal, 0), [rows]);
  const payments = useMemo(() => rows.filter((row) => row.rowType === "payment").reduce((sum, row) => sum + row.rowTotal, 0), [rows]);
  const finalBalance = previousBalance + subtotal - payments;

  function updateRow(index: number, patch: Partial<EditorRow>) {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patch };
      next.rowTotal = next.rowType === "payment" ? next.unitPrice : Math.round(next.qty * next.unitPrice);
      return next;
    }));
  }

  function changeQty(index: number, raw: string) {
    const qtyText = sanitizeQtyInput(raw);
    updateRow(index, { qtyText, qty: parseQty(qtyText) });
  }

  function addSaleRow() {
    setRows((current) => [...current, emptyRow()]);
  }

  function addPaymentRow() {
    setRows((current) => [...current, { rowType: "payment", description: "واریزی مشتری", qty: 1, qtyText: "۱", unit: "—", unitPrice: 0, rowTotal: 0 }]);
  }

  function removeRow(index: number) {
    setRows((current) => current.length === 1 ? [emptyRow()] : current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function createCustomer() {
    if (!newCustomer.name.trim()) return;
    const result = await mutate({ action: "customer.create", ...newCustomer }, "مشتری جدید اضافه شد");
    if (typeof result.id === "number") setCustomerId(result.id);
    setNewCustomer({ name: "", phone: "", note: "" });
    setCustomerModal(false);
  }

  async function saveInvoice() {
    setSaving(true);
    try {
      await mutate(
        { action: "invoice.create", customerId, jalaliDate: date, note, items: rows },
        "فاکتور با موفقیت ثبت شد",
      );
      setRows([emptyRow()]);
      setNote("");
      setDate(data.today);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="صدور فاکتور"
        description="اقلام و خدمات را آزادانه وارد کنید؛ همه محاسبات به‌صورت خودکار انجام می‌شود."
        action={<div className="invoice-code"><span>شماره فاکتور</span><strong>{toPersianDigits(data.nextInvoiceNumber)}</strong></div>}
      />

      <div className="invoice-layout">
        <main className="invoice-form-column">
          <section className="card invoice-info-card">
            <div className="section-title"><span className="section-title-icon"><UsersRound size={19} /></span><div><h2>اطلاعات فاکتور</h2><p>مشتری و تاریخ صدور را مشخص کنید</p></div></div>
            <div className="invoice-info-grid">
              <Field label="انتخاب مشتری">
                <div className="compound-field">
                  <select value={customerId} onChange={(event) => setCustomerId(Number(event.target.value))}>
                    <option value={0}>یک مشتری انتخاب کنید</option>
                    {data.customers.map((item) => <option value={item.id} key={item.id}>{item.name} — {item.phone}</option>)}
                  </select>
                  <button type="button" onClick={() => setCustomerModal(true)} title="افزودن مشتری"><UserPlus size={18} /></button>
                </div>
              </Field>
              <Field label="تاریخ شمسی">
                <div className="input-with-icon"><CalendarDays size={17} /><input value={toPersianDigits(date)} onChange={(event) => setDate(sanitizeJalaliDate(event.target.value))} inputMode="numeric" /></div>
              </Field>
            </div>
            {customer ? (
              <div className="selected-customer-bar">
                <span><b>{customer.name}</b>{customer.phone ? ` • ${toPersianDigits(customer.phone)}` : ""}</span>
                <span>مانده قبلی: <strong className={previousBalance > 0 ? "text-danger" : "text-success"}>{formatToman(Math.abs(previousBalance))}</strong></span>
              </div>
            ) : (
              <div className="selected-customer-bar is-warning"><span>برای ثبت فاکتور، ابتدا مشتری را انتخاب یا ایجاد کنید.</span><button onClick={() => setCustomerModal(true)}>افزودن مشتری</button></div>
            )}
          </section>

          <section className="card items-card">
            <div className="card-heading items-heading">
              <div className="section-title"><span className="section-title-icon"><FilePlus2 size={19} /></span><div><h2>اقلام و خدمات</h2><p>هر ردیف را به‌صورت دستی وارد کنید</p></div></div>
              <span className="row-counter">{formatNumber(rows.length)} ردیف</span>
            </div>
            <div className="invoice-edit-table-wrap">
              <table className="invoice-edit-table">
                <thead><tr><th>#</th><th>نوع</th><th>شرح</th><th>تعداد</th><th>واحد</th><th>قیمت واحد</th><th>جمع</th><th /></tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr className={row.rowType === "payment" ? "edit-payment-row" : ""} key={index}>
                      <td><span className="row-index">{toPersianDigits(index + 1)}</span></td>
                      <td><span className={`row-kind ${row.rowType}`}>{row.rowType === "sale" ? "فروش" : "واریزی"}</span></td>
                      <td><input className="description-input" value={row.description} onChange={(event) => updateRow(index, { description: event.target.value })} placeholder={row.rowType === "sale" ? "شرح خدمت یا کالا..." : "شرح واریزی..."} /></td>
                      <td><input disabled={row.rowType === "payment"} value={row.rowType === "payment" ? "—" : row.qtyText} onChange={(event) => changeQty(index, event.target.value)} inputMode="text" placeholder="۱" /></td>
                      <td><input disabled={row.rowType === "payment"} value={row.rowType === "payment" ? "—" : row.unit} onChange={(event) => updateRow(index, { unit: event.target.value })} list="invoice-units" /></td>
                      <td><AmountInput className="money-input" value={row.unitPrice} onChange={(value) => updateRow(index, { unitPrice: value })} placeholder="۰" /></td>
                      <td><strong className={row.rowType === "payment" ? "text-success" : ""}>{formatNumber(row.rowTotal)}</strong></td>
                      <td><button type="button" className="delete-row" onClick={() => removeRow(index)} title="حذف ردیف"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="invoice-units">{unitOptions.map((unit) => <option key={unit} value={unit} />)}</datalist>
            </div>
            <div className="items-actions">
              <button className="button button-secondary" type="button" onClick={addSaleRow}><Plus size={17} /> افزودن ردیف فروش</button>
              <button className="button button-payment" type="button" onClick={addPaymentRow}><CreditCard size={17} /> ثبت واریزی مشتری</button>
            </div>
          </section>

          <section className="card invoice-note-card">
            <Field label="توضیحات فاکتور" hint="این متن در پایین جدول اقلام چاپ می‌شود.">
              <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="توضیحات تکمیلی (اختیاری)..." rows={3} />
            </Field>
          </section>
        </main>

        <aside className="invoice-summary-column">
          <section className="card sticky-summary">
            <div className="section-title"><span className="section-title-icon"><CircleDollarSign size={19} /></span><div><h2>خلاصه فاکتور</h2><p>محاسبه لحظه‌ای مبالغ</p></div></div>
            <div className="editor-summary-lines">
              <div><span>جمع فروش</span><b>{formatToman(subtotal)}</b></div>
              <div className="payment-summary"><span>واریزی مشتری</span><b>− {formatToman(payments)}</b></div>
              <div><span>مانده قبلی</span><b>{formatToman(previousBalance)}</b></div>
              <div className={`editor-final ${finalBalance > 0 ? "debt" : "credit"}`}><span>مانده نهایی مشتری</span><strong>{formatToman(Math.abs(finalBalance))}</strong><small>{finalBalance > 0 ? "بدهکار" : finalBalance < 0 ? "بستانکار" : "تسویه"}</small></div>
            </div>
            <div className="words-box"><span>جمع کل به حروف</span><p>{numberToPersianWords(subtotal)}</p></div>
            <button className="button button-primary button-full" disabled={saving || !customerId} onClick={saveInvoice}><Save size={18} />{saving ? "در حال ذخیره..." : "ذخیره فاکتور"}</button>
            <div className="secondary-actions">
              <button className="button button-ghost" onClick={() => setPreviewOpen(true)}><Eye size={17} /> پیش‌نمایش</button>
              <button className="button button-ghost" onClick={() => { setPreviewOpen(true); setTimeout(() => window.print(), 150); }}><Printer size={17} /> چاپ</button>
              <button className="button button-ghost" onClick={() => { setPreviewOpen(true); setTimeout(() => window.print(), 150); }}><FileDown size={17} /> PDF</button>
            </div>
            <div className="save-hint"><span>ذخیره امن</span><p>اطلاعات پس از ثبت به دفتر حساب مشتری افزوده می‌شود.</p></div>
          </section>
        </aside>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="پیش‌نمایش فاکتور" subtitle="آنچه می‌بینید دقیقاً برای چاپ یا PDF آماده است." size="xl">
        <div className="preview-stage">
          <div className="preview-toolbar"><span>کاغذ A4 • حالت عمودی</span><button className="button button-primary" onClick={() => window.print()}><Printer size={17} /> چاپ / ذخیره PDF</button></div>
          <InvoicePaper number={data.nextInvoiceNumber} date={date} customer={customer} items={rows} previousBalance={previousBalance} note={note} settings={data.settings} />
        </div>
      </Modal>

      <Modal open={customerModal} onClose={() => setCustomerModal(false)} title="افزودن مشتری جدید" subtitle="مشتری پس از ثبت به‌صورت خودکار انتخاب می‌شود." size="sm">
        <div className="form-grid one-column">
          <Field label="نام و نام خانوادگی"><input autoFocus value={newCustomer.name} onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })} placeholder="مثلاً: علی رضایی" /></Field>
          <Field label="شماره تماس"><input value={newCustomer.phone} onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })} placeholder="۰۹۱۲۱۲۳۴۵۶۷" /></Field>
          <Field label="یادداشت"><textarea rows={2} value={newCustomer.note} onChange={(event) => setNewCustomer({ ...newCustomer, note: event.target.value })} placeholder="اختیاری" /></Field>
          <div className="modal-actions"><button className="button button-ghost" onClick={() => setCustomerModal(false)}>انصراف</button><button className="button button-primary" onClick={createCustomer} disabled={!newCustomer.name.trim()}><UserPlus size={17} /> ثبت مشتری</button></div>
        </div>
      </Modal>
    </>
  );
}
