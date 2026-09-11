"use client";

import { formatNumber, formatToman, parseAmount } from "@/lib/format";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  size = "md",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-card modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="بستن">
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Amount({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`amount ${className}`}>{formatToman(value)}</span>;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "۰",
  className = "",
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <input
      className={className}
      value={value ? formatNumber(value) : ""}
      onChange={(event) => onChange(parseAmount(event.target.value))}
      inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

export function BalanceBadge({ value }: { value: number }) {
  if (value === 0) return <span className="badge badge-neutral">تسویه</span>;
  return (
    <span className={`badge ${value > 0 ? "badge-danger" : "badge-success"}`}>
      {value > 0 ? "بدهکار" : "بستانکار"}
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="پاک کردن جست‌وجو">
          <X size={15} />
        </button>
      ) : null}
    </label>
  );
}

export function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-table" aria-label="در حال بارگذاری">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <i /><i /><i /><i />
        </div>
      ))}
    </div>
  );
}
