"use client";

import { formatCardNumber, formatJalali, formatNumber, formatQty, numberToPersianWords, toPersianDigits } from "@/lib/format";
import type { BusinessSettings, CustomerDto, InvoiceItemDto } from "@/lib/types";
import { Building2, MapPin, Phone, UserRound } from "lucide-react";

export function InvoicePaper({
  number,
  date,
  customer,
  items,
  previousBalance,
  note,
  settings,
  compact = false,
}: {
  number: string;
  date: string;
  customer?: CustomerDto;
  items: InvoiceItemDto[];
  previousBalance: number;
  note?: string;
  settings: BusinessSettings;
  compact?: boolean;
}) {
  const sales = items.filter((item) => item.rowType === "sale");
  const payments = items.filter((item) => item.rowType === "payment");
  const subtotal = sales.reduce((sum, item) => sum + item.rowTotal, 0);
  const totalPayments = payments.reduce((sum, item) => sum + item.rowTotal, 0);
  const endBalance = previousBalance + subtotal - totalPayments;
  const printableItems = items.length
    ? items
    : [{ rowType: "sale" as const, description: "هنوز ردیفی وارد نشده است", qty: 0, unit: "—", unitPrice: 0, rowTotal: 0 }];

  return (
    <article className={`invoice-paper ${compact ? "invoice-paper-compact" : ""}`} dir="rtl">
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
          <span>فاکتور فروش</span>
          <strong>{toPersianDigits(number)}</strong>
          <small>تاریخ: {formatJalali(date)}</small>
        </div>
      </header>

      <section className="invoice-customer">
        <div className="invoice-section-icon"><UserRound size={16} /></div>
        <div>
          <small>مشخصات مشتری</small>
          <strong>{customer?.name || "مشتری انتخاب نشده"}</strong>
        </div>
        <p>شماره تماس: <b>{customer?.phone ? toPersianDigits(customer.phone) : "—"}</b></p>
      </section>

      <table className="invoice-items-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>شرح خدمات / اقلام</th>
            <th>تعداد</th>
            <th>واحد</th>
            <th>قیمت واحد</th>
            <th>جمع (تومان)</th>
          </tr>
        </thead>
        <tbody>
          {printableItems.map((item, index) => (
            <tr className={item.rowType === "payment" ? "payment-line" : ""} key={`${item.description}-${index}`}>
              <td>{toPersianDigits(index + 1)}</td>
              <td>
                {item.rowType === "payment" ? <span className="payment-tag">واریزی</span> : null}
                {item.description}
              </td>
              <td>{item.rowType === "payment" ? "—" : formatQty(item.qty)}</td>
              <td>{item.rowType === "payment" ? "—" : item.unit}</td>
              <td>{formatNumber(item.unitPrice)}</td>
              <td>{formatNumber(item.rowTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {note ? <div className="invoice-note"><b>توضیحات:</b> {note}</div> : null}

      <section className="invoice-summary">
        <div className="summary-words">
          <small>جمع کل به حروف</small>
          <p>{numberToPersianWords(subtotal)}</p>
        </div>
        <div className="summary-numbers">
          <div><span>جمع فروش</span><b>{formatNumber(subtotal)} تومان</b></div>
          {totalPayments > 0 ? <div className="summary-payment"><span>واریزی مشتری</span><b>− {formatNumber(totalPayments)} تومان</b></div> : null}
          {previousBalance !== 0 ? <div><span>مانده قبلی</span><b>{formatNumber(previousBalance)} تومان</b></div> : null}
          <div className={`summary-final ${endBalance > 0 ? "is-debt" : "is-credit"}`}>
            <span>مانده نهایی</span>
            <b>{formatNumber(Math.abs(endBalance))} تومان</b>
          </div>
        </div>
      </section>

      <footer className="invoice-footer">
        <div>
          {settings.cardNumber ? <p><b>شماره کارت:</b> {toPersianDigits(settings.cardNumber)}</p> : null}
          <p>{settings.footer}</p>
        </div>
        <span>صفحه ۱ از ۱</span>
      </footer>
    </article>
  );
}
