"use client";

import { useConfirm } from "@/components/confirm";
import { InvoicePaper } from "@/components/invoice-paper";
import { StatementPaper, type StatementRow } from "@/components/statement-paper";
import { AmountInput, EmptyState, Modal, PageHeader, SearchBox } from "@/components/ui";
import { formatCardNumber, formatJalali, formatNumber, formatQty, formatToman, initials, sanitizeJalaliDate, toPersianDigits } from "@/lib/format";
import type { AppData, CustomerDto, InvoiceDto, LedgerDto } from "@/lib/types";
import { AlertCircle, CalendarRange, Check, Edit3, Eye, FileDown, FileText, Phone, Printer, ReceiptText, ShieldCheck, Trash2, TrendingUp, UserRoundX, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";

type Debtor = CustomerDto & { reportBalance: number; transactionCount: number };
type Mutate = (payload: Record<string, unknown>, successMessage?: string) => Promise<Record<string, unknown>>;

export function Debtors({ data, mutate }: { data: AppData; mutate: Mutate }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Debtor | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ jalaliDate: "", description: "", debit: 0, credit: 0 });
  const [preview, setPreview] = useState<InvoiceDto | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const inRange = (date: string) => (!filter.from || date >= filter.from) && (!filter.to || date <= filter.to);
  const rangeLabel = filter.from || filter.to ? `${filter.from ? formatJalali(filter.from) : "ابتدا"} تا ${filter.to ? formatJalali(filter.to) : "امروز"}` : "همه زمان‌ها";

  const debtors = useMemo(() => {
    const ranged = Boolean(filter.from || filter.to);
    return data.customers
      .map((customer) => {
        const entries = data.ledger.filter((entry) => entry.customerId === customer.id && inRange(entry.jalaliDate));
        const reportBalance = ranged ? entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0) : customer.balance;
        return { ...customer, reportBalance, transactionCount: entries.length };
      })
      .filter((customer) => customer.reportBalance > 0 && `${customer.name} ${customer.phone}`.includes(query))
      .sort((a, b) => b.reportBalance - a.reportBalance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.customers, data.ledger, filter, query]);
  const total = debtors.reduce((sum, customer) => sum + customer.reportBalance, 0);
  const average = debtors.length ? Math.round(total / debtors.length) : 0;

  const baseEntries = useMemo<LedgerDto[]>(() => {
    if (!statementCustomer) return [];
    return data.ledger
      .filter((entry) => entry.customerId === statementCustomer.id && inRange(entry.jalaliDate))
      .slice()
      .reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.ledger, statementCustomer, filter]);

  const statementEntries = useMemo<StatementRow[]>(() => {
    let running = 0;
    const detailed: StatementRow[] = [];
    baseEntries.forEach((entry) => {
      const invoice = entry.refInvoiceId ? data.invoices.find((item) => item.id === entry.refInvoiceId) : undefined;
      if (invoice && invoice.items.length) {
        invoice.items.forEach((item, itemIndex) => {
          const debit = item.rowType === "sale" ? item.rowTotal : 0;
          const credit = item.rowType === "payment" ? item.rowTotal : 0;
          running += debit - credit;
          detailed.push({
            ...entry,
            id: entry.id * 1000 + itemIndex,
            description:
              item.rowType === "sale"
                ? `${item.description} (${formatQty(item.qty)} ${item.unit} × ${formatNumber(item.unitPrice)})`
                : item.description,
            jalaliDate: invoice.jalaliDate,
            debit,
            credit,
            running,
            invoiceNumber: invoice.number,
            isItem: true,
          });
        });
      } else {
        running += entry.debit - entry.credit;
        detailed.push({ ...entry, running });
      }
    });
    return detailed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseEntries, data.invoices]);

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
        message: `فاکتور «${invoice ? toPersianDigits(invoice.number) : ""}» به‌طور کامل حذف شود؟ اقلام و تراکنش مربوط هم پاک می‌شوند.`,
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

  function closeStatement() {
    setStatementCustomer(null);
    setEditingId(null);
  }

  const previewCustomer = preview ? data.customers.find((customer) => customer.id === preview.customerId) : undefined;
  const liveCustomer = statementCustomer ? data.customers.find((customer) => customer.id === statementCustomer.id) ?? statementCustomer : null;

  return (
    <>
      <PageHeader
        title="گزارش بدهکاران"
        description="مطالبات مشتریان را بررسی و برای هر بدهکار صورت‌حساب رسمی صادر کنید"
        action={<button className="button button-primary" onClick={() => setReportOpen(true)} disabled={!debtors.length}><FileDown size={18} /> گزارش کلی PDF</button>}
      />

      <section className="debtor-stats">
        <article><span className="debtor-stat-icon red"><AlertCircle size={21} /></span><div><small>مجموع مطالبات</small><strong>{formatToman(total)}</strong></div></article>
        <article><span className="debtor-stat-icon orange"><UsersRound size={21} /></span><div><small>تعداد بدهکاران</small><strong>{formatNumber(debtors.length)} نفر</strong></div></article>
        <article><span className="debtor-stat-icon teal"><TrendingUp size={21} /></span><div><small>میانگین بدهی</small><strong>{formatToman(average)}</strong></div></article>
      </section>

      <section className="card debtors-card">
        <div className="list-toolbar debtor-toolbar">
          <SearchBox value={query} onChange={setQuery} placeholder="جست‌وجوی بدهکار..." />
          <div className="date-filter"><label><CalendarRange size={16} /><input value={toPersianDigits(filter.from)} onChange={(event) => setFilter({ ...filter, from: sanitizeJalaliDate(event.target.value) })} placeholder="از تاریخ" /></label><span>تا</span><label><input value={toPersianDigits(filter.to)} onChange={(event) => setFilter({ ...filter, to: sanitizeJalaliDate(event.target.value) })} placeholder="تا تاریخ" /></label>{(filter.from || filter.to) ? <button onClick={() => setFilter({ from: "", to: "" })}>همه زمان‌ها</button> : null}</div>
        </div>
        {debtors.length ? (
          <div className="table-wrap"><table className="data-table debtor-table"><thead><tr><th>رتبه</th><th>مشتری</th><th>شماره تماس</th><th>تعداد تراکنش</th><th>مبلغ بدهی (تومان)</th><th>سهم از مطالبات</th><th>صورت‌حساب</th></tr></thead><tbody>
            {debtors.map((customer, index) => (
              <tr key={customer.id} className="clickable-row" onClick={() => setStatementCustomer(customer)}>
                <td><span className={`rank ${index < 3 ? "top" : ""}`}>{toPersianDigits(index + 1)}</span></td>
                <td><div className="customer-cell"><span className="avatar debt-avatar">{initials(customer.name)}</span><div><b>{customer.name}</b><small>بدهکار</small></div></div></td>
                <td><span className="phone-cell"><Phone size={14} />{customer.phone ? toPersianDigits(customer.phone) : "—"}</span></td>
                <td>{formatNumber(customer.transactionCount)} تراکنش</td>
                <td><b className="large-debt">{formatToman(customer.reportBalance)}</b></td>
                <td><div className="debt-share"><div><i style={{ width: `${total ? (customer.reportBalance / total) * 100 : 0}%` }} /></div><span>{toPersianDigits(Math.round(total ? customer.reportBalance / total * 100 : 0))}٪</span></div></td>
                <td><button className="button button-secondary button-small" onClick={(event) => { event.stopPropagation(); setStatementCustomer(customer); }}><FileText size={15} /> صدور فاکتور</button></td>
              </tr>
            ))}
          </tbody></table></div>
        ) : (
          <EmptyState icon={query || filter.from || filter.to ? <UserRoundX size={28} /> : <ShieldCheck size={29} />} title={query || filter.from || filter.to ? "بدهکاری در این فیلتر پیدا نشد" : "هیچ مشتری بدهکاری وجود ندارد"} text={query || filter.from || filter.to ? "بازه تاریخ یا عبارت جست‌وجو را تغییر دهید." : "همه حساب‌ها تسویه هستند؛ عالی است!"} />
        )}
      </section>

      <Modal open={Boolean(statementCustomer)} onClose={closeStatement} title={`صورت‌حساب ${statementCustomer?.name ?? ""}`} subtitle={`بازه: ${rangeLabel} • ریز اقلام هر فاکتور در چاپ نمایش داده می‌شود`} size="xl">
        {liveCustomer ? (
          <div className="statement-modal">
            <div className="statement-quick">
              <div><span>مجموع بدهکار</span><b className="text-danger">{formatToman(statementEntries.reduce((sum, item) => sum + item.debit, 0))}</b></div>
              <div><span>مجموع بستانکار</span><b className="text-success">{formatToman(statementEntries.reduce((sum, item) => sum + item.credit, 0))}</b></div>
              <div><span>مانده در بازه</span><b>{formatToman(statementEntries.reduce((sum, item) => sum + item.debit - item.credit, 0))}</b></div>
            </div>

            <div className="statement-manage">
              <div className="statement-manage-head"><h3>مدیریت تراکنش‌های این بازه</h3><p>ویرایش، مشاهده و حذف فاکتور یا تراکنش</p></div>
              {baseEntries.length ? (
                <div className="table-wrap"><table className="data-table compact-table statement-edit-table"><thead><tr><th>تاریخ</th><th>شرح</th><th>بدهکار (تومان)</th><th>بستانکار (تومان)</th><th>عملیات</th></tr></thead><tbody>
                  {baseEntries.map((entry) => editingId === entry.id ? (
                    <tr className="editing-row" key={entry.id}>
                      <td className="edit-cell date-cell"><input value={toPersianDigits(editForm.jalaliDate)} onChange={(event) => setEditForm({ ...editForm, jalaliDate: sanitizeJalaliDate(event.target.value) })} inputMode="numeric" /></td>
                      <td className="edit-cell desc-cell"><input value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></td>
                      <td className="edit-cell"><AmountInput value={editForm.debit} onChange={(value) => setEditForm({ ...editForm, debit: value })} disabled={entry.automatic} /></td>
                      <td className="edit-cell"><AmountInput value={editForm.credit} onChange={(value) => setEditForm({ ...editForm, credit: value })} disabled={entry.automatic} /></td>
                      <td>
                        <div className="row-actions">
                          <button className="table-action green" title="ذخیره" onClick={saveEdit} disabled={!editForm.description.trim()}><Check size={16} /></button>
                          <button className="table-action" title="انصراف" onClick={() => setEditingId(null)}><X size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={entry.id}>
                      <td>{formatJalali(entry.jalaliDate)}</td>
                      <td><span className="transaction-desc">{entry.refInvoiceId ? <ReceiptText size={14} /> : null}{entry.description}</span></td>
                      <td>{entry.debit ? formatToman(entry.debit) : "—"}</td>
                      <td className="text-success">{entry.credit ? formatToman(entry.credit) : "—"}</td>
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
              ) : <EmptyState icon={<ReceiptText size={25} />} title="تراکنشی در این بازه نیست" text="بازه تاریخ را تغییر دهید." />}
            </div>

            <div className="preview-stage report-stage">
              <div className="preview-toolbar"><span>صورت‌حساب {liveCustomer.name} • {rangeLabel} • {formatNumber(statementEntries.length)} ردیف</span><button className="button button-primary" onClick={() => window.print()}><Printer size={17} /> صدور فاکتور / چاپ PDF</button></div>
              <StatementPaper customer={liveCustomer} entries={statementEntries} date={data.today} rangeLabel={rangeLabel} settings={data.settings} />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={`پیش‌نمایش فاکتور ${preview ? toPersianDigits(preview.number) : ""}`} subtitle="نمای چاپی دقیق روی کاغذ A4" size="xl">
        {preview ? (
          <div className="preview-stage">
            <div className="preview-toolbar"><button className="button button-primary" onClick={() => window.print()}><Printer size={17} /> چاپ / خروجی PDF</button></div>
            <InvoicePaper number={preview.number} date={preview.jalaliDate} customer={previewCustomer} items={preview.items} previousBalance={preview.previousBalance} note={preview.note} settings={data.settings} />
          </div>
        ) : null}
      </Modal>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="پیش‌نمایش گزارش بدهکاران" subtitle="گزارش رسمی آماده چاپ روی کاغذ A4" size="xl">
        <div className="preview-stage report-stage">
          <div className="preview-toolbar"><span>گزارش {formatNumber(debtors.length)} مشتری بدهکار</span><button className="button button-primary" onClick={() => window.print()}><Printer size={17} /> چاپ / ذخیره PDF</button></div>
          <article className="debtor-report-paper" dir="rtl">
            <div className="report-topline" />
            <header><div><small>گزارش مالی</small><h2>{data.settings.businessName}</h2><p>فهرست مشتریان بدهکار</p></div><div className="report-date"><span>تاریخ گزارش</span><b>{formatJalali(data.today)}</b></div></header>
            <section className="report-summary"><div><span>مجموع مطالبات</span><strong>{formatToman(total)}</strong></div><div><span>تعداد بدهکاران</span><strong>{formatNumber(debtors.length)} نفر</strong></div><div><span>بازه گزارش</span><strong>{rangeLabel}</strong></div></section>
            <table><thead><tr><th>ردیف</th><th>نام مشتری</th><th>شماره تماس</th><th>تعداد تراکنش</th><th>مانده بدهی (تومان)</th></tr></thead><tbody>{debtors.map((customer, index) => <tr key={customer.id}><td>{toPersianDigits(index + 1)}</td><td><b>{customer.name}</b></td><td>{customer.phone ? toPersianDigits(customer.phone) : "—"}</td><td>{formatNumber(customer.transactionCount)}</td><td><strong>{formatNumber(customer.reportBalance)}</strong></td></tr>)}</tbody></table>
            <footer><div><p>{toPersianDigits(data.settings.address)} • {toPersianDigits(data.settings.phone)}</p>{data.settings.cardNumber ? <p className="invoice-card-line"><b>شماره کارت:</b> <span className="invoice-card-number">{formatCardNumber(data.settings.cardNumber)}</span>{data.settings.cardOwner ? ` (به نام ${data.settings.cardOwner})` : ""}</p> : null}{data.settings.manager ? <p className="invoice-manager"><b>مدیریت:</b> {data.settings.manager}</p> : null}</div><span>صفحه ۱ از ۱</span></footer>
          </article>
        </div>
      </Modal>

      {confirmDialog}
    </>
  );
}
