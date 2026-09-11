"use client";

import { StatementPaper, type StatementRow } from "@/components/statement-paper";
import { EmptyState, Modal, PageHeader, SearchBox } from "@/components/ui";
import { formatCardNumber, formatJalali, formatNumber, formatToman, initials, sanitizeJalaliDate, toPersianDigits } from "@/lib/format";
import type { AppData, CustomerDto } from "@/lib/types";
import { AlertCircle, CalendarRange, FileDown, FileText, Phone, Printer, ShieldCheck, TrendingUp, UserRoundX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

type Debtor = CustomerDto & { reportBalance: number; transactionCount: number };

export function Debtors({ data }: { data: AppData }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Debtor | null>(null);

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

  const statementEntries = useMemo<StatementRow[]>(() => {
    if (!statementCustomer) return [];
    let running = 0;
    return data.ledger
      .filter((entry) => entry.customerId === statementCustomer.id && inRange(entry.jalaliDate))
      .slice()
      .reverse()
      .map((entry) => {
        running += entry.debit - entry.credit;
        return { ...entry, running };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.ledger, statementCustomer, filter]);

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
          <div className="table-wrap"><table className="data-table debtor-table"><thead><tr><th>رتبه</th><th>مشتری</th><th>شماره تماس</th><th>تعداد تراکنش</th><th>مبلغ بدهی</th><th>سهم از مطالبات</th><th>صورت‌حساب</th></tr></thead><tbody>
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

      <Modal open={Boolean(statementCustomer)} onClose={() => setStatementCustomer(null)} title={`صورت‌حساب ${statementCustomer?.name ?? ""}`} subtitle={`بازه: ${rangeLabel} • آماده چاپ روی کاغذ A4`} size="xl">
        {statementCustomer ? (
          <div className="statement-modal">
            <div className="statement-quick">
              <div><span>مجموع بدهکار</span><b className="text-danger">{formatToman(statementEntries.reduce((sum, item) => sum + item.debit, 0))}</b></div>
              <div><span>مجموع بستانکار</span><b className="text-success">{formatToman(statementEntries.reduce((sum, item) => sum + item.credit, 0))}</b></div>
              <div><span>مانده در بازه</span><b>{formatToman(statementEntries.reduce((sum, item) => sum + item.debit - item.credit, 0))}</b></div>
            </div>
            <div className="preview-stage report-stage">
              <div className="preview-toolbar"><span>صورت‌حساب {statementCustomer.name} • {rangeLabel}</span><button className="button button-primary" onClick={() => window.print()}><Printer size={17} /> صدور فاکتور / چاپ PDF</button></div>
              <StatementPaper customer={statementCustomer} entries={statementEntries} date={data.today} rangeLabel={rangeLabel} settings={data.settings} />
            </div>
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
            <footer><div><p>{toPersianDigits(data.settings.address)} • {toPersianDigits(data.settings.phone)}</p>{data.settings.cardNumber ? <p><b>شماره کارت:</b> {formatCardNumber(data.settings.cardNumber)}{data.settings.cardOwner ? ` (به نام ${data.settings.cardOwner})` : ""}</p> : null}{data.settings.manager ? <p><b>مدیریت:</b> {data.settings.manager}</p> : null}</div><span>صفحه ۱ از ۱</span></footer>
          </article>
        </div>
      </Modal>
    </>
  );
}
