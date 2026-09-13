"use client";

import { Customers } from "@/components/sections/customers";
import { Dashboard } from "@/components/sections/dashboard";
import { Debtors } from "@/components/sections/debtors";
import { InvoiceEditor } from "@/components/sections/invoice-editor";
import { Ledger } from "@/components/sections/ledger";
import { Settings } from "@/components/sections/settings";
import { defaultSettings, type AppData } from "@/lib/types";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  CircleAlert,
  CloudOff,
  FilePlus2,
  LayoutDashboard,
  Menu,
  PanelRightClose,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const navItems = [
  { id: "dashboard", label: "داشبورد", icon: LayoutDashboard },
  { id: "invoice", label: "صدور فاکتور", icon: FilePlus2 },
  { id: "customers", label: "مشتریان", icon: UsersRound },
  { id: "ledger", label: "دفتر حساب", icon: BookOpen },
  { id: "debtors", label: "گزارش بدهکاران", icon: WalletCards },
  { id: "settings", label: "تنظیمات", icon: Settings2 },
];

export function AppShell() {
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/app", { cache: "no-store" });
      const result = (await response.json()) as AppData & { error?: string };
      if (!response.ok) throw new Error(result.error || "امکان خواندن اطلاعات وجود ندارد.");
      setData(result);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "خطای ارتباط با پایگاه‌داده");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setActive("invoice");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!data) return;
    const dailyKey = `copy-center-backup-${data.today}`;
    if (!localStorage.getItem(dailyKey)) {
      fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "backup.mark" }) })
        .then(() => localStorage.setItem(dailyKey, "done"))
        .catch(() => undefined);
    }
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function mutate(payload: Record<string, unknown>, successMessage = "تغییرات ذخیره شد") {
    try {
      const response = await fetch("/api/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as Record<string, unknown> & { error?: string };
      if (!response.ok) throw new Error(result.error || "عملیات انجام نشد.");
      await load(true);
      setToast({ type: "success", text: successMessage });
      return result;
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "خطایی رخ داد." });
      throw error;
    }
  }

  function navigate(page: string) {
    setActive(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const debtorCount = useMemo(() => data?.customers.filter((customer) => customer.balance > 0).length ?? 0, [data]);
  const settings = data?.settings ?? defaultSettings;
  const ActivePage = () => {
    if (!data) return null;
    if (active === "invoice") return <InvoiceEditor data={data} mutate={mutate} />;
    if (active === "customers") return <Customers data={data} mutate={mutate} />;
    if (active === "ledger") return <Ledger data={data} mutate={mutate} />;
    if (active === "debtors") return <Debtors data={data} mutate={mutate} />;
    if (active === "settings") return <Settings data={data} mutate={mutate} />;
    return <Dashboard data={data} onNavigate={navigate} />;
  };

  if (loading) {
    return (
      <main className="app-loading" dir="rtl">
        <div className="loading-brand"><span><Building2 size={28} /></span><div><b>چاپینو</b><small>مدیریت مرکز کپی و چاپ</small></div></div>
        <div className="loading-spinner"><RefreshCw size={23} /></div>
        <p>در حال آماده‌سازی اطلاعات...</p>
      </main>
    );
  }

  if (loadError || !data) {
    return (
      <main className="app-error" dir="rtl">
        <span><CircleAlert size={29} /></span><h1>پایگاه‌داده در دسترس نیست</h1><p>{loadError}</p><button className="button button-primary" onClick={() => load()}><RefreshCw size={17} /> تلاش دوباره</button>
      </main>
    );
  }

  return (
    <div className="app-root" dir="rtl" data-theme={settings.theme} style={{ "--primary": settings.primary } as React.CSSProperties}>
      <button className={`mobile-overlay ${sidebarOpen ? "visible" : ""}`} aria-label="بستن منو" onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark">
            {settings.logo ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={settings.logo} alt="لوگو" /></> : <Building2 size={24} />}
          </div>
          <div className="brand-text"><strong>چاپینو</strong><span>مدیریت چاپ و حساب</span></div>
          <button className="mobile-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <div className="business-pill"><span className="business-avatar">{settings.businessName.slice(0, 1)}</span><div><b>{settings.businessName}</b><small>فضای کاری فعال</small></div><ChevronLeft size={15} /></div>
        <nav className="side-nav" aria-label="منوی اصلی">
          <p>منوی اصلی</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={active === id ? "active" : ""} onClick={() => navigate(id)} key={id}>
              <Icon size={19} /><span>{label}</span>
              {id === "debtors" && debtorCount > 0 ? <i>{debtorCount.toLocaleString("fa-IR")}</i> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip"><span><ShieldCheck size={17} /></span><div><b>اطلاعات شما امن است</b><p>پشتیبان‌گیری روزانه فعال</p></div></div>
        <footer className="sidebar-footer"><CloudOff size={15} /><span>آماده کار بدون اینترنت</span><small>نسخه ۱.۰</small></footer>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-start"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><div className="breadcrumb"><span>چاپینو</span><ChevronLeft size={14} /><b>{navItems.find((item) => item.id === active)?.label}</b></div></div>
          <div className="topbar-actions"><div className="local-status"><i /> داده‌ها روی سیستم شما</div><button className="top-icon" title="اعلان‌ها"><Bell size={19} /></button><span className="top-separator" /><button className="quick-invoice" onClick={() => navigate("invoice")}><ReceiptText size={17} /><span>فاکتور جدید</span><kbd>Ctrl N</kbd></button></div>
        </header>
        <div className="mobile-pagebar"><button onClick={() => setSidebarOpen(true)}><PanelRightClose size={19} /></button><b>{navItems.find((item) => item.id === active)?.label}</b></div>
        <div className="app-content"><ActivePage /></div>
      </div>

      {toast ? <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? <ShieldCheck size={19} /> : <CircleAlert size={19} />}<span>{toast.text}</span><button onClick={() => setToast(null)}><X size={15} /></button></div> : null}
    </div>
  );
}
