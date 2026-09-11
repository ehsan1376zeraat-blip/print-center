import { toJalaali } from "jalaali-js";

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const enDigits = "0123456789";

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => faDigits[Number(digit)]);
}

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(faDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function parseAmount(value: string | number): number {
  const normalized = toEnglishDigits(String(value)).replace(/٫/g, ".").replace(/−/g, "-").replace(/[,٬،\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function formatNumber(value: number | string): string {
  const parsed = typeof value === "string" ? Number(value) : value;
  const safe = Number.isFinite(parsed) ? parsed : 0;
  const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Math.abs(safe));
  return `${safe < 0 ? "−" : ""}${toPersianDigits(grouped.replace(/,/g, "٬").replace(/\./g, "٫"))}`;
}

export function formatCardNumber(value: string): string {
  const digits = toEnglishDigits(value).replace(/[^0-9]/g, "").slice(0, 16);
  return toPersianDigits(digits.replace(/(\d{4})(?=\d)/g, "$1-"));
}

export function parseQty(value: string | number): number {
  const normalized = toEnglishDigits(String(value)).replace(/[،,\s]/g, "").replace("/", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function sanitizeQtyInput(value: string): string {
  const cleaned = toEnglishDigits(value).replace(/[^0-9/]/g, "");
  const [first, ...rest] = cleaned.split("/");
  const joined = rest.length ? `${first}/${rest.join("")}` : first;
  return toPersianDigits(joined);
}

export function formatQty(value: number): string {
  if (Number.isInteger(value)) return toPersianDigits(value);
  const [intPart, decPart] = String(value).split(".");
  return toPersianDigits(`${intPart}/${decPart}`);
}

export function formatToman(value: number | string): string {
  return `${formatNumber(value)} تومان`;
}

export function todayJalali(): string {
  const today = new Date();
  const { jy, jm, jd } = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

export function jalaliYear(): string {
  return todayJalali().slice(0, 4);
}

export function formatJalali(value: string): string {
  return toPersianDigits(value.replaceAll("-", "/"));
}

const ones = [
  "",
  "یک",
  "دو",
  "سه",
  "چهار",
  "پنج",
  "شش",
  "هفت",
  "هشت",
  "نه",
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
];
const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const hundreds = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

function underThousand(value: number): string {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  let rest = value % 100;
  if (hundred) parts.push(hundreds[hundred]);
  if (rest) {
    if (rest < 20) parts.push(ones[rest]);
    else {
      const ten = Math.floor(rest / 10);
      rest %= 10;
      parts.push(tens[ten]);
      if (rest) parts.push(ones[rest]);
    }
  }
  return parts.join(" و ");
}

export function numberToPersianWords(input: number): string {
  const value = Math.round(Math.abs(input));
  if (value === 0) return "صفر تومان";
  const groups: string[] = [];
  let remaining = value;
  let scaleIndex = 0;
  while (remaining > 0 && scaleIndex < scales.length) {
    const group = remaining % 1000;
    if (group) {
      const label = scales[scaleIndex];
      groups.unshift(`${underThousand(group)}${label ? ` ${label}` : ""}`);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }
  return `${groups.join(" و ")} تومان`;
}

export function sanitizeJalaliDate(value: string): string {
  const normalized = toEnglishDigits(value).replace(/[^0-9]/g, "").slice(0, 8);
  if (normalized.length <= 4) return normalized;
  if (normalized.length <= 6) return `${normalized.slice(0, 4)}/${normalized.slice(4)}`;
  return `${normalized.slice(0, 4)}/${normalized.slice(4, 6)}/${normalized.slice(6)}`;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("");
}
