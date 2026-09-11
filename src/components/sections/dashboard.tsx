"use client";

import { InvoicePaper } from "@/components/invoice-paper";
import { Amount, BalanceBadge, EmptyState, Modal, PageHeader } from "@/components/ui";
import { formatJalali, formatNumber, formatToman, initials, toPersianDigits } from "@/lib/format";
import type { AppData, InvoiceDto } from "@/lib/types";
import { ArrowLeft, BanknoteArrowUp, CalendarDays, Eye, FilePlus2, ReceiptText, UsersRound, WalletCards } from "lucide-react";
import { useState } from "react";

export function Dashboard({ data, onNavigate }: { data: AppData; onNavigate: (page: string) => void }) {
  const [preview, setPreview] = useState<InvoiceDto | null>(null);
  const statCards = [
    { label: "فروش امروز", value: formatToman(data.stats.todaySales), detail: formatJalali(data.today), icon: CalendarDays, tone: "mint" },
    { label: "فروش این ماه", value: formatToman(data.stats.monthSales), detail: "از ابتدای ماه جاری", icon: BanknoteArrowUp, tone: "teal" },
    { label: "تعداد مشتریان", value: `${formatNumber(data.stats.customerCount)} نفر`, detail: "مشتری ثبت‌شده", icon: UsersRound, tone: "blue" },
    { label: "مجموع مطالبات", value: formatToman(data.stats.totalReceivables), detail: "مانده حساب‌های بدهکار", icon: WalletCards, tone: "red" },
  ];
  const previewCustomer = preview ? data.customers.find((customer) => customer.id === preview.customerId) : undefined;

  return (
    <>
      <PageHeader
        title="داشبورد"
        description="نمایی سریع از وضعیت فروش، مشتریان و مطالبات مرکز"
        action={
          <button className="button button-primary button-large" onClick={() => onNavigate("invoice")}>
            <FilePlus2 size={19} /> فاکتور جدید
          </button>
        }
      />

      <section className="stats-grid">
        {statCards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="stat-card" key={label}>
            <div className={`stat-icon tone-${tone}`}><Icon size={23} /></div>
            <div className="stat-copy">
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="card recent-card">
        <div className="card-heading">
          <div>
            <h2>آخرین فاکتورها</h2>
            <p>پنج فاکتور آخر ثبت‌شده در سیستم</p>
          </div>
          <button className="text-button" onClick={() => onNavigate("customers")}>
            مشاهده همه <ArrowLeft size={16} />
          </button>
        </div>
        {data.invoices.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>شماره فاکتور</th><th>مشتری</th><th>تاریخ</th><th>مبلغ فروش</th><th>مانده</th><th>عملیات</th></tr></thead>
              <tbody>
                {data.invoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td><span className="invoice-number"><ReceiptText size={15} /> {toPersianDigits(invoice.number)}</span></td>
                    <td>
                      <div className="customer-cell"><span className="mini-avatar">{initials(invoice.customerName)}</span><div><b>{invoice.customerName}</b><small>{invoice.customerPhone ? toPersianDigits(invoice.customerPhone) : "بدون شماره"}</small></div></div>
                    </td>
                    <td>{formatJalali(invoice.jalaliDate)}</td>
                    <td><Amount value={invoice.subtotal} /></td>
                    <td><div className="balance-cell"><Amount value={Math.abs(invoice.endBalance)} /><BalanceBadge value={invoice.endBalance} /></div></td>
                    <td><button className="table-action" onClick={() => setPreview(invoice)} title="پیش‌نمایش"><Eye size={17} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ReceiptText size={27} />}
            title="هنوز فاکتوری ثبت نشده است"
            text="اولین فاکتور فروش را بسازید؛ شماره فاکتور به‌صورت خودکار ایجاد می‌شود."
            action={<button className="button button-secondary" onClick={() => onNavigate("invoice")}><FilePlus2 size={17} /> ساخت اولین فاکتور</button>}
          />
        )}
      </section>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={`پیش‌نمایش فاکتور ${preview ? toPersianDigits(preview.number) : ""}`} subtitle="نمای چاپی دقیق روی کاغذ A4" size="xl">
        {preview ? (
          <div className="preview-stage">
            <div className="preview-toolbar"><button className="button button-primary" onClick={() => window.print()}><ReceiptText size={17} /> چاپ / خروجی PDF</button></div>
            <InvoicePaper number={preview.number} date={preview.jalaliDate} customer={previewCustomer} items={preview.items} previousBalance={preview.previousBalance} note={preview.note} settings={data.settings} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
