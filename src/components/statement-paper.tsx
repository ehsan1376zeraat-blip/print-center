"use client";

import { formatCardNumber, formatJalali, formatNumber, numberToPersianWords, toPersianDigits } from "@/lib/format";
import type { BusinessSettings, CustomerDto, LedgerDto } from "@/lib/types";
import { Building2, CalendarRange, MapPin, Phone, UserRound } from "lucide-react";

export type StatementRow = LedgerDto & { running: number; invoiceNumber?: string; isItem?: boolean };

export function StatementPaper({
  customer,
  entries,
  date,
  rangeLabel,
  settings,
}: {
  customer: CustomerDto;
  entries: StatementRow[];
  date: string;
  rangeLabel: string;
  settings: BusinessSettings;
}) {
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const balance = totalDebit - totalCredit;

  return (
    <article className="invoice-paper" dir="rtl">
      <div className="invoice-topline" />
      <header className="invoice-brand-head">
        <div className="invoice-brand">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt="لوگوی کسب‌وکار" />
          ) : (
            <div className="invoice-logo-fallback"><Building2 size={27} /></div>
          )}
          <div>
            <h2>{settings.businessName || "نام کسب‌وکار"}</h2>
            <p><Phone size={11} /> {settings.phone ? toPersianDigits(settings.phone) : "شماره تماس"}</p>
            <p><MapPin size={11} /> {settings.address ? toPersianDigits(settings.address) : "آدرس کسب‌وکار"}</p>
          </div>
        </div>
        <div className="invoice-meta">
          <span>صورت‌حساب بدهکار</span>
          <strong>{formatNumber(Math.abs(balance))} تومان</strong>
          <small>تاریخ صدور: {formatJalali(date)}</small>
        </div>
      </header>

      <section className="invoice-customer">
        <div className="invoice-section-icon"><UserRound size={16} /></div>
        <div>
          <small>مشخصات مشتری</small>
          <strong>{customer.name}</strong>
        </div>
        <p className="statement-range"><CalendarRange size={12} /> {rangeLabel}</p>
        <p>شماره تماس: <b>{customer.phone ? toPersianDigits(customer.phone) : "—"}</b></p>
      </section>

      <table className="invoice-items-table statement-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>شرح</th>
            <th>تاریخ</th>
            <th>بدهکار (تومان)</th>
            <th>بستانکار (تومان)</th>
          </tr>
        </thead>
        <tbody>
          {entries.length ? (
            entries.map((entry, index) => (
              <tr key={`${entry.id}-${index}`} className={entry.isItem ? "statement-item-row" : entry.credit > 0 && entry.debit === 0 ? "payment-line" : ""}>
                <td>{toPersianDigits(index + 1)}</td>
                <td>
                  {entry.invoiceNumber ? <span className="invoice-ref-tag">فاکتور {toPersianDigits(entry.invoiceNumber)}</span> : null}
                  {entry.description}
                </td>
                <td>{formatJalali(entry.jalaliDate)}</td>
                <td>{entry.debit ? formatNumber(entry.debit) : "—"}</td>
                <td>{entry.credit ? formatNumber(entry.credit) : "—"}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={5} className="statement-empty">در این بازه تراکنشی ثبت نشده است</td></tr>
          )}
        </tbody>
      </table>

      <section className="invoice-summary">
        <div className="summary-words">
          <small>مانده نهایی به حروف</small>
          <p>{numberToPersianWords(balance)}{balance < 0 ? " (بستانکار)" : ""}</p>
        </div>
        <div className="summary-numbers">
          <div><span>مجموع بدهکار</span><b>{formatNumber(totalDebit)} تومان</b></div>
          <div className="summary-payment"><span>مجموع بستانکار</span><b>− {formatNumber(totalCredit)} تومان</b></div>
          <div className={`summary-final ${balance > 0 ? "is-debt" : "is-credit"}`}>
            <span>{balance >= 0 ? "مانده بدهی" : "مانده بستانکار"}</span>
            <b>{formatNumber(Math.abs(balance))} تومان</b>
          </div>
        </div>
      </section>

      <footer className="invoice-footer">
        <div>
          {settings.cardNumber ? <p className="invoice-card-line"><b>شماره کارت:</b> <span className="invoice-card-number">{formatCardNumber(settings.cardNumber)}</span>{settings.cardOwner ? ` (به نام ${settings.cardOwner})` : ""}</p> : null}
          <p>{settings.footer}</p>
          {settings.manager ? <p className="invoice-manager"><b>مدیریت:</b> {settings.manager}</p> : null}
        </div>
        <span>صفحه ۱ از ۱</span>
      </footer>
    </article>
  );
}
