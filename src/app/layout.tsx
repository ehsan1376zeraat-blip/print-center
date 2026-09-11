import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/vazirmatn/300.css";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "چاپینو | مدیریت مرکز کپی و چاپ",
  description: "نرم‌افزار حرفه‌ای صدور فاکتور و مدیریت حساب مرکز کپی و چاپ",
  applicationName: "چاپینو",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#27AE60",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
