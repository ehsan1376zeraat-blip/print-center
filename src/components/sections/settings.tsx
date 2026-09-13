"use client";

import { InvoicePaper } from "@/components/invoice-paper";
import { Field, PageHeader } from "@/components/ui";
import { formatJalali, toPersianDigits } from "@/lib/format";
import type { AppData, BusinessSettings } from "@/lib/types";
import { Building2, Check, CloudCog, Download, ImagePlus, Moon, Palette, Save, Settings2, Sun, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Mutate = (payload: Record<string, unknown>, successMessage?: string) => Promise<Record<string, unknown>>;

const palettes = [
  { name: "سبز بهاری", color: "#27AE60", soft: "#A9DFBF" },
  { name: "سبز آبی", color: "#16A085", soft: "#A3E4D7" },
  { name: "آبی آرام", color: "#2980B9", soft: "#AED6F1" },
  { name: "بنفش مدرن", color: "#7D3C98", soft: "#D2B4DE" },
];

export function Settings({ data, mutate }: { data: AppData; mutate: Mutate }) {
  const [form, setForm] = useState<BusinessSettings>(data.settings);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setForm(data.settings), [data.settings]);

  function patch(values: Partial<BusinessSettings>) {
    setForm((current) => ({ ...current, ...values }));
  }

  function chooseLogo(file?: File) {
    if (!file) return;
    if (file.size > 1_500_000) {
      setLogoError("حجم لوگو باید کمتر از ۱.۵ مگابایت باشد.");
      return;
    }
    setLogoError("");
    const reader = new FileReader();
    reader.onload = () => patch({ logo: String(reader.result ?? "") });
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      await mutate({ action: "settings.update", settings: form }, "تنظیمات با موفقیت ذخیره شد");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="تنظیمات"
        description="هویت بصری، اطلاعات تماس، چاپ فاکتور و پشتیبان‌گیری"
        action={<button className="button button-primary" onClick={save} disabled={saving}><Save size={18} />{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button>}
      />

      <div className="settings-layout">
        <main className="settings-forms">
          <section className="card settings-card">
            <div className="section-title"><span className="section-title-icon"><Building2 size={19} /></span><div><h2>اطلاعات کسب‌وکار</h2><p>این اطلاعات در سربرگ و پاورقی فاکتور درج می‌شود</p></div></div>
            <div className="logo-editor">
              <div className="logo-preview">
                {form.logo ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={form.logo} alt="لوگو" /><button onClick={() => patch({ logo: "" })} title="حذف لوگو"><X size={14} /></button></> : <Building2 size={28} />}
              </div>
              <div><b>لوگوی کسب‌وکار</b><p>{logoError || "فرمت PNG یا JPG، حداکثر ۱.۵ مگابایت"}</p><button className="button button-secondary button-small" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> انتخاب لوگو</button><input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={(event) => chooseLogo(event.target.files?.[0])} /></div>
            </div>
            <div className="form-grid settings-grid">
              <Field label="نام کسب‌وکار"><input value={form.businessName} onChange={(event) => patch({ businessName: event.target.value })} placeholder="نام مرکز کپی و چاپ" /></Field>
              <Field label="شماره تماس"><input value={form.phone} onChange={(event) => patch({ phone: event.target.value })} placeholder="۰۲۱-۱۲۳۴۵۶۷۸" /></Field>
              <Field label="آدرس" wide><input value={form.address} onChange={(event) => patch({ address: event.target.value })} placeholder="آدرس کامل کسب‌وکار" /></Field>
              <Field label="شماره کارت"><input value={form.cardNumber} onChange={(event) => patch({ cardNumber: event.target.value })} placeholder="۶۰۳۷-۹۹۱۲-۳۴۵۶-۷۸۹۰" inputMode="numeric" /></Field>
              <Field label="صاحب کارت (به نام)"><input value={form.cardOwner} onChange={(event) => patch({ cardOwner: event.target.value })} placeholder="نام صاحب حساب" /></Field>
              <Field label="نام مدیریت" wide><input value={form.manager} onChange={(event) => patch({ manager: event.target.value })} placeholder="نام مدیر مرکز" /></Field>
              <Field label="متن پاورقی فاکتور" wide><textarea rows={3} value={form.footer} onChange={(event) => patch({ footer: event.target.value })} placeholder="از اعتماد شما سپاسگزاریم." /></Field>
            </div>
          </section>

          <section className="card settings-card">
            <div className="section-title"><span className="section-title-icon"><Palette size={19} /></span><div><h2>ظاهر برنامه</h2><p>تم و رنگ اصلی رابط کاربری را انتخاب کنید</p></div></div>
            <div className="theme-options">
              <button className={form.theme === "light" ? "selected" : ""} onClick={() => patch({ theme: "light" })}><span className="theme-thumb light"><Sun size={22} /></span><span><b>تم روشن</b><small>ساده و پرنور</small></span>{form.theme === "light" ? <i><Check size={13} /></i> : null}</button>
              <button className={form.theme === "dark" ? "selected" : ""} onClick={() => patch({ theme: "dark" })}><span className="theme-thumb dark"><Moon size={22} /></span><span><b>تم تاریک</b><small>مناسب محیط کم‌نور</small></span>{form.theme === "dark" ? <i><Check size={13} /></i> : null}</button>
            </div>
            <div className="palette-label"><b>رنگ اصلی</b><span>این رنگ در دکمه‌ها و فاکتور استفاده می‌شود.</span></div>
            <div className="palette-options">
              {palettes.map((palette) => <button className={form.primary === palette.color ? "selected" : ""} onClick={() => patch({ primary: palette.color })} key={palette.color}><i style={{ background: palette.color }} /> <span>{palette.name}</span>{form.primary === palette.color ? <b style={{ background: palette.soft }}><Check size={13} /></b> : null}</button>)}
            </div>
          </section>

          <section className="card settings-card">
            <div className="section-title"><span className="section-title-icon"><CloudCog size={19} /></span><div><h2>پشتیبان‌گیری</h2><p>مسیر نگهداری نسخه پشتیبان روزانه را مشخص کنید</p></div></div>
            <div className="backup-box">
              <Field label="مسیر پشتیبان‌گیری" hint="نسخه روزانه داده‌ها در مسیر انتخابی نگهداری می‌شود."><div className="compound-field"><input value={form.backupPath} onChange={(event) => patch({ backupPath: event.target.value })} placeholder="مثلاً D:\CopyCenter\Backups" /><button title="انتخاب مسیر"><Upload size={17} /></button></div></Field>
              <button className="button button-secondary" onClick={() => mutate({ action: "backup.mark" }, "وضعیت پشتیبان ثبت شد")}><Download size={17} /> پشتیبان‌گیری اکنون</button>
            </div>
            <div className="backup-note"><Settings2 size={17} /><p><b>پشتیبان‌گیری خودکار روزانه فعال است</b><span>اولین اجرای برنامه در هر روز یک نسخه امن ایجاد می‌کند.</span></p></div>
          </section>
        </main>

        <aside className="live-preview-column">
          <div className="live-preview-head"><div><span className="live-dot" /><b>پیش‌نمایش زنده فاکتور</b></div><small>{formatJalali(data.today)}</small></div>
          <div className="mini-paper-stage" style={{ "--primary": form.primary } as React.CSSProperties}>
            <InvoicePaper compact number={data.nextInvoiceNumber} date={data.today} items={[]} previousBalance={0} note="" settings={form} />
          </div>
          <p className="preview-caption">تغییرات بالا بلافاصله در نمونه فاکتور نمایش داده می‌شود.</p>
        </aside>
      </div>
    </>
  );
}
