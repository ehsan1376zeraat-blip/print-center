"use client";

import { Amount, AmountInput, BalanceBadge, EmptyState, Field, Modal, PageHeader, SearchBox } from "@/components/ui";
import { formatJalali, formatNumber, formatToman, initials, sanitizeJalaliDate, toPersianDigits } from "@/lib/format";
import type { AppData, CustomerDto, LedgerDto } from "@/lib/types";
import { BookOpenCheck, Check, Edit3, Phone, Plus, ReceiptText, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";

type Mutate = (payload: Record<string, unknown>, successMessage?: string) => Promise<Record<string, unknown>>;
type StatementEntry = LedgerDto & { runningBalance: number };

export function Customers({ data, mutate }: { data: AppData; mutate: Mutate }) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<CustomerDto | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ jalaliDate: "", description: "", debit: 0, credit: 0 });

  const filtered = data.customers.filter((customer) => `${customer.name} ${customer.phone}`.includes(query.trim()));
  const liveStatementCustomer = statementCustomer ? data.customers.find((customer) => customer.id === statementCustomer.id) ?? statementCustomer : null;
  const statement = useMemo<StatementEntry[]>(() => {
    if (!liveStatementCustomer) return [];
    let balance = 0;
    return data.ledger
      .filter((entry) => entry.customerId === liveStatementCustomer.id)
      .slice()
      .reverse()
      .map((entry) => {
        balance += entry.debit - entry.credit;
        return { ...entry, runningBalance: balance };
      })
      .reverse();
  }, [data.ledger, liveStatementCustomer]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", phone: "", note: "" });
    setFormOpen(true);
  }

  function openEdit(customer: CustomerDto) {
    setEditing(customer);
    setForm({ name: customer.name, phone: customer.phone, note: customer.note });
    setFormOpen(true);
  }

  async function submit() {
    await mutate({ action: editing ? "customer.update" : "customer.create", id: editing?.id, ...form }, editing ? "اطلاعات مشتری ویرایش شد" : "مشتری جدید ثبت شد");
    setFormOpen(false);
  }

  async function remove(customer: CustomerDto) {
    if (!window.confirm(`مشتری «${customer.name}» حذف شود؟`)) return;
    await mutate({ action: "customer.delete", id: customer.id }, "مشتری حذف شد");
  }

  function startEntryEdit(entry: StatementEntry) {
    setEditingEntryId(entry.id);
    setEditForm({ jalaliDate: entry.jalaliDate, description: entry.description, debit: entry.debit, credit: entry.credit });
  }

  async function saveEntryEdit() {
    if (!editingEntryId) return;
    await mutate({ action: "ledger.update", id: editingEntryId, ...editForm }, "تراکنش ویرایش شد");
    setEditingEntryId(null);
  }

  async function removeEntry(entry: StatementEntry) {
    if (!window.confirm("این تراکنش حذف شود؟")) return;
    await mutate({ action: "ledger.delete", id: entry.id }, "تراکنش حذف شد");
  }

  function closeStatement() {
    setStatementCustomer(null);
    setEditingEntryId(null);
  }

  return (
    <>
      <PageHeader
        title="مشتریان"
        description="مدیریت مشتریان و مشاهده صورت‌حساب کامل هر مشتری"
        action={<button className="button button-primary" onClick={openCreate}><Plus size={18} /> افزودن مشتری</button>}
      />

      <section className="card customers-card">
        <div className="list-toolbar">
          <SearchBox value={query} onChange={setQuery} placeholder="جست‌وجو بر اساس نام یا شماره تماس..." />
          <div className="list-count"><UsersRound size={17} /><span>{formatNumber(filtered.length)} مشتری</span></div>
        </div>

        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table customer-table">
              <thead><tr><th>مشتری</th><th>شماره تماس</th><th>تاریخ عضویت</th><th>مانده حساب (تومان)</th><th>وضعیت</th><th>عملیات</th></tr></thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr className={customer.balance > 0 ? "debtor-row" : ""} key={customer.id} onDoubleClick={() => setStatementCustomer(customer)}>
                    <td><div className="customer-cell"><span className="avatar">{initials(customer.name)}</span><div><b>{customer.name}</b><small>{customer.note || "بدون یادداشت"}</small></div></div></td>
                    <td><span className="phone-cell"><Phone size={14} />{customer.phone ? toPersianDigits(customer.phone) : "—"}</span></td>
                    <td>{toPersianDigits(new Date(customer.createdAt).toLocaleDateString("fa-IR"))}</td>
                    <td><Amount value={Math.abs(customer.balance)} className={customer.balance > 0 ? "text-danger" : customer.balance < 0 ? "text-success" : ""} /></td>
                    <td><BalanceBadge value={customer.balance} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="table-action green" title="صورت‌حساب" onClick={() => setStatementCustomer(customer)}><BookOpenCheck size={17} /></button>
                        <button className="table-action" title="ویرایش" onClick={() => openEdit(customer)}><Edit3 size={16} /></button>
                        <button className="table-action danger" title="حذف" onClick={() => remove(customer)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<UserRound size={27} />} title={query ? "مشتری پیدا نشد" : "هنوز مشتری ثبت نشده است"} text={query ? "عبارت جست‌وجو را تغییر دهید." : "برای صدور اولین فاکتور، یک مشتری ایجاد کنید."} action={!query ? <button className="button button-secondary" onClick={openCreate}><Plus size={17} /> افزودن مشتری</button> : undefined} />
        )}
      </section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "ویرایش مشتری" : "افزودن مشتری جدید"} subtitle="اطلاعات تماس برای درج خودکار در فاکتور استفاده می‌شود." size="sm">
        <div className="form-grid one-column">
          <Field label="نام و نام خانوادگی"><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="نام مشتری" /></Field>
          <Field label="شماره تماس"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="۰۹۱۲۱۲۳۴۵۶۷" /></Field>
          <Field label="یادداشت"><textarea rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="توضیحات اختیاری درباره مشتری" /></Field>
          <div className="modal-actions"><button className="button button-ghost" onClick={() => setFormOpen(false)}>انصراف</button><button className="button button-primary" disabled={!form.name.trim()} onClick={submit}>{editing ? <Edit3 size={17} /> : <Plus size={17} />}{editing ? "ذخیره تغییرات" : "ثبت مشتری"}</button></div>
        </div>
      </Modal>

      <Modal open={Boolean(liveStatementCustomer)} onClose={closeStatement} title={`صورت‌حساب ${liveStatementCustomer?.name ?? ""}`} subtitle="تمام خریدها، واریزی‌ها و مانده لحظه‌ای مشتری — روی هر تراکنش برای ویرایش کلیک کنید" size="lg">
        {liveStatementCustomer ? (
          <div className="statement-content">
            <div className="statement-summary">
              <div><span>تعداد تراکنش</span><b>{formatNumber(statement.length)}</b></div>
              <div><span>مجموع بدهکار</span><b>{formatToman(statement.reduce((sum, item) => sum + item.debit, 0))}</b></div>
              <div><span>مجموع بستانکار</span><b className="text-success">{formatToman(statement.reduce((sum, item) => sum + item.credit, 0))}</b></div>
              <div className={liveStatementCustomer.balance > 0 ? "danger-summary" : "green-summary"}><span>مانده نهایی</span><b>{formatToman(Math.abs(liveStatementCustomer.balance))}</b></div>
            </div>
            {statement.length ? (
              <div className="table-wrap"><table className="data-table compact-table statement-edit-table"><thead><tr><th>تاریخ</th><th>شرح</th><th>بدهکار (تومان)</th><th>بستانکار (تومان)</th><th>مانده (تومان)</th><th>عملیات</th></tr></thead><tbody>
                {statement.map((entry) => editingEntryId === entry.id ? (
                  <tr className="editing-row" key={entry.id}>
                    <td className="edit-cell date-cell"><input value={toPersianDigits(editForm.jalaliDate)} onChange={(event) => setEditForm({ ...editForm, jalaliDate: sanitizeJalaliDate(event.target.value) })} inputMode="numeric" /></td>
                    <td className="edit-cell desc-cell"><input value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} placeholder="شرح تراکنش" /></td>
                    <td className="edit-cell"><AmountInput value={editForm.debit} onChange={(value) => setEditForm({ ...editForm, debit: value })} disabled={entry.automatic} /></td>
                    <td className="edit-cell"><AmountInput value={editForm.credit} onChange={(value) => setEditForm({ ...editForm, credit: value })} disabled={entry.automatic} /></td>
                    <td><small className="edit-hint">{entry.automatic ? "فاکتور" : "—"}</small></td>
                    <td>
                      <div className="row-actions">
                        <button className="table-action green" title="ذخیره" onClick={saveEntryEdit} disabled={!editForm.description.trim()}><Check size={16} /></button>
                        <button className="table-action" title="انصراف" onClick={() => setEditingEntryId(null)}><X size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id}>
                    <td>{formatJalali(entry.jalaliDate)}</td>
                    <td><span className="transaction-desc">{entry.refInvoiceId ? <ReceiptText size={14} /> : null}{entry.description}</span></td>
                    <td>{entry.debit ? formatToman(entry.debit) : "—"}</td>
                    <td className="text-success">{entry.credit ? formatToman(entry.credit) : "—"}</td>
                    <td><b className={entry.runningBalance > 0 ? "text-danger" : "text-success"}>{formatToman(Math.abs(entry.runningBalance))}</b></td>
                    <td>
                      <div className="row-actions">
                        <button className="table-action" title="ویرایش تراکنش" onClick={() => startEntryEdit(entry)}><Edit3 size={15} /></button>
                        {!entry.automatic ? <button className="table-action danger" title="حذف تراکنش" onClick={() => removeEntry(entry)}><Trash2 size={15} /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody></table></div>
            ) : <EmptyState icon={<BookOpenCheck size={25} />} title="صورت‌حساب خالی است" text="هنوز تراکنشی برای این مشتری ثبت نشده است." />}
            {editingEntryId ? <p className="auto-edit-note"><ReceiptText size={14} /> در تراکنش‌های فاکتور فقط تاریخ و شرح قابل ویرایش است؛ مبلغ از طریق فاکتور تغییر می‌کند.</p> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
