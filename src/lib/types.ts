export type CustomerDto = {
  id: number;
  name: string;
  phone: string;
  note: string;
  createdAt: string;
  balance: number;
};

export type InvoiceItemDto = {
  id?: number;
  invoiceId?: number;
  rowType: "sale" | "payment";
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  rowTotal: number;
  position?: number;
};

export type InvoiceDto = {
  id: number;
  number: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  jalaliDate: string;
  subtotal: number;
  totalPayments: number;
  previousBalance: number;
  endBalance: number;
  note: string;
  createdAt: string;
  items: InvoiceItemDto[];
};

export type LedgerDto = {
  id: number;
  customerId: number;
  customerName: string;
  jalaliDate: string;
  debit: number;
  credit: number;
  description: string;
  refInvoiceId: number | null;
  automatic: boolean;
  createdAt: string;
};

export type BusinessSettings = {
  businessName: string;
  phone: string;
  address: string;
  cardNumber: string;
  cardOwner: string;
  manager: string;
  footer: string;
  theme: "light" | "dark";
  primary: string;
  backupPath: string;
  logo: string;
};

export type DashboardStats = {
  todaySales: number;
  monthSales: number;
  customerCount: number;
  totalReceivables: number;
};

export type AppData = {
  customers: CustomerDto[];
  invoices: InvoiceDto[];
  ledger: LedgerDto[];
  settings: BusinessSettings;
  stats: DashboardStats;
  nextInvoiceNumber: string;
  today: string;
};

export const defaultSettings: BusinessSettings = {
  businessName: "مرکز کپی و چاپ بهار",
  phone: "۰۲۱-۱۲۳۴۵۶۷۸",
  address: "تهران، آدرس کسب‌وکار شما",
  cardNumber: "",
  cardOwner: "",
  manager: "",
  footer: "از اعتماد شما سپاسگزاریم.",
  theme: "light",
  primary: "#27AE60",
  backupPath: "",
  logo: "",
};
