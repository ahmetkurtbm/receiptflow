"use client";

import {
  AlertCircle, Check, ChevronRight, CircleDollarSign, CloudUpload, FileCheck2,
  FileText, LayoutDashboard, LoaderCircle, Plus, ReceiptText, Search, Sparkles,
  Tag, Trash2, X
} from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type FieldCategory = "merchant" | "document" | "tax" | "payment" | "classification" | "other";
type FieldDataType = "text" | "number" | "currency" | "date" | "percentage";
type DynamicField = {
  id: string; key: string; label: string; value: string; description: string;
  category: FieldCategory; dataType: FieldDataType; confidence: number; source: "receipt" | "inferred";
};
type LineItem = { description: string; quantity: string; unitPrice: string; vatRate: string; total: string };
type ReceiptAnalysis = {
  documentType: string; currency: string; summary: string; confidence: number;
  fields: DynamicField[]; lineItems: LineItem[]; provider?: string; model?: string;
};
type SavedReceipt = ReceiptAnalysis & { id: string; createdAt: string; fileName: string };

const categoryLabels: Record<FieldCategory, string> = {
  merchant: "Firma bilgileri", document: "Belge bilgileri", tax: "Vergi ve tutarlar",
  payment: "Odeme bilgileri", classification: "Masraf siniflandirmasi", other: "Diger bilgiler",
};
const categoryOrder: FieldCategory[] = ["merchant", "document", "tax", "payment", "classification", "other"];

const emptyAnalysis = (): ReceiptAnalysis => ({
  documentType: "", currency: "TRY", summary: "", confidence: 0, fields: [], lineItems: [],
});

const fieldValue = (analysis: ReceiptAnalysis, keys: string[]) =>
  analysis.fields.find((field) => keys.includes(field.key))?.value || "";

const money = (value: string, currency = "TRY") => {
  const amount = Number(value.replace(",", ".") || 0);
  try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount); }
  catch { return `${amount.toLocaleString("tr-TR")} ${currency}`; }
};

export default function Home() {
  const [activeView, setActiveView] = useState<"new" | "records">("new");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState<ReceiptAnalysis>(emptyAnalysis);
  const [records, setRecords] = useState<SavedReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; setup?: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("receiptflow-dynamic-records");
    if (stored) setRecords(JSON.parse(stored));
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Gercek AI analizi icin JPG, PNG veya WEBP gorseli secin." }); return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "Dosya boyutu en fazla 10 MB olabilir." }); return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected); setPreview(URL.createObjectURL(selected)); setAnalysis(emptyAnalysis()); setMessage(null);
  };

  const extractReceipt = async () => {
    if (!file) return;
    setLoading(true); setMessage(null);
    const form = new FormData(); form.append("receipt", file);
    try {
      const response = await fetch("/api/receipts/extract", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: result.error || "Fis analiz edilemedi.", setup: result.code === "MISSING_API_KEY" });
        return;
      }
      setAnalysis(result);
      setMessage({ type: "success", text: `${result.fields.length} alan ve ${result.lineItems.length} harcama satiri gercek AI ile bulundu.` });
    } catch {
      setMessage({ type: "error", text: "AI servisine ulasilamadi. Baglantinizi kontrol edin." });
    } finally { setLoading(false); }
  };

  const updateField = (id: string, property: keyof DynamicField, value: string) => {
    setAnalysis((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === id
        ? { ...field, [property]: property === "confidence" ? Number(value) : value }
        : field),
    }));
  };
  const removeField = (id: string) => setAnalysis((current) => ({ ...current, fields: current.fields.filter((field) => field.id !== id) }));
  const addField = () => setAnalysis((current) => ({
    ...current,
    fields: [...current.fields, {
      id: crypto.randomUUID(), key: `customField${current.fields.length + 1}`, label: "Yeni alan", value: "",
      description: "Kullanici tarafindan eklenen belge bilgisi.", category: "other", dataType: "text", confidence: 100, source: "inferred",
    }],
  }));

  const groupedFields = useMemo(() => categoryOrder.map((category) => ({
    category, fields: analysis.fields.filter((field) => field.category === category),
  })).filter((group) => group.fields.length), [analysis.fields]);

  const saveReceipt = (event: FormEvent) => {
    event.preventDefault();
    if (!analysis.fields.length) { setMessage({ type: "error", text: "Kaydetmeden once fisi AI ile analiz edin." }); return; }
    const next: SavedReceipt = { ...analysis, id: crypto.randomUUID(), createdAt: new Date().toISOString(), fileName: file?.name || "Belge" };
    const updated = [next, ...records]; setRecords(updated);
    localStorage.setItem("receiptflow-dynamic-records", JSON.stringify(updated));
    setMessage({ type: "success", text: "Dinamik fis kaydi olusturuldu." });
    setTimeout(() => setActiveView("records"), 500);
  };
  const clearForm = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setAnalysis(emptyAnalysis()); setMessage(null);
  };
  const deleteRecord = (id: string) => {
    const updated = records.filter((record) => record.id !== id); setRecords(updated);
    localStorage.setItem("receiptflow-dynamic-records", JSON.stringify(updated));
  };

  const filteredRecords = useMemo(() => records.filter((record) =>
    `${record.summary} ${record.documentType} ${record.fields.map((field) => field.value).join(" ")}`
      .toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))
  ), [records, search]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><ReceiptText size={22} /></span><span>ReceiptFlow</span></div>
        <nav aria-label="Ana menu">
          <button className={activeView === "new" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("new")}><Plus size={19} /><span>Yeni fis</span></button>
          <button className={activeView === "records" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("records")}><FileCheck2 size={19} /><span>Kayitlar</span><b>{records.length}</b></button>
        </nav>
        <div className="sidebar-foot"><Sparkles size={18} /><div><strong>Google Gemini</strong><span>Dinamik belge analizi</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">AI MASRAF YONETIMI</p><h1>{activeView === "new" ? "Dinamik fis analizi" : "Fis kayitlari"}</h1></div>
          <div className="status-pill"><span /> Gercek AI modu</div>
        </header>

        {activeView === "new" ? (
          <div className="new-receipt-layout">
            <section className="upload-column">
              <div className="section-heading"><div><span className="step">1</span><h2>Fis gorselini yukleyin</h2></div><p>JPG, PNG, WEBP · En fazla 10 MB</p></div>
              {!file ? (
                <button className={dragging ? "dropzone dragging" : "dropzone"} onClick={() => fileInput.current?.click()}
                  onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                  onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }}>
                  <span className="upload-icon"><CloudUpload size={30} /></span><strong>Fisi buraya birakin</strong><span>veya bilgisayarinizdan secin</span><em>Gorsel sec</em>
                </button>
              ) : (
                <div className="preview-area">
                  <img src={preview} alt="Yuklenen fis onizlemesi" />
                  <button className="remove-file" title="Dosyayi kaldir" onClick={clearForm}><X size={18} /></button>
                  <div className="file-caption"><FileCheck2 size={18} /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div></div>
                </div>
              )}
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => chooseFile(e.target.files?.[0])} />
              <button className="analyze-button" disabled={!file || loading} onClick={extractReceipt}>
                {loading ? <><LoaderCircle className="spin" size={19} /> Gemini belgeyi okuyor</> : <><Sparkles size={19} /> Gemini ile analiz et</>}
              </button>
              <div className="privacy-note"><Check size={16} /><span>Alanlar belgenin icerigine gore otomatik olusur.</span></div>
            </section>

            <form className="form-column dynamic-form" onSubmit={saveReceipt}>
              <div className="section-heading form-title"><div><span className="step">2</span><h2>Bulunan dinamik alanlar</h2></div>{analysis.confidence > 0 && <span className="confidence">AI guveni <b>%{analysis.confidence}</b></span>}</div>
              {message && <div className={`message ${message.type}`}><span>{message.type === "success" ? <Check size={17} /> : <AlertCircle size={17} />}</span><div>{message.text}{message.setup && <small className="setup-hint">Proje klasorunde `.env.local` olusturun: GEMINI_API_KEY=...</small>}</div></div>}

              {!analysis.fields.length && !loading ? (
                <div className="analysis-placeholder"><span><ReceiptText size={29} /></span><h3>Alanlar fise gore burada olusacak</h3><p>Firma, vergi ve toplam bilgilerinin yaninda belgede bulunan kasa, terminal, adres, KDV kirilimi ve urun satirlari da otomatik eklenir.</p></div>
              ) : (
                <>
                  <div className="analysis-meta"><div><small>Belge turu</small><strong>{analysis.documentType}</strong></div><div><small>Model</small><strong>{analysis.model}</strong></div><p>{analysis.summary}</p></div>
                  {groupedFields.map((group) => (
                    <section className="field-group" key={group.category}>
                      <div className="group-heading"><h3>{categoryLabels[group.category]}</h3><span>{group.fields.length} alan</span></div>
                      <div className="fields-grid">
                        {group.fields.map((field) => (
                          <label className="field dynamic-field" key={field.id}>
                            <span className="field-label"><Tag size={15} />{field.label}<em className={field.source}>{field.source === "receipt" ? `AI %${field.confidence}` : "AI onerisi"}</em><button type="button" title="Alani kaldir" onClick={() => removeField(field.id)}><X size={14} /></button></span>
                            <input type={field.dataType === "date" ? "date" : "text"} value={field.value} onChange={(e) => updateField(field.id, "value", e.target.value)} />
                            <small>{field.description}</small>
                          </label>
                        ))}
                      </div>
                    </section>
                  ))}
                  {analysis.lineItems.length > 0 && <section className="line-items"><div className="group-heading"><h3>Fis satirlari</h3><span>{analysis.lineItems.length} kalem</span></div><div className="line-table"><table><thead><tr><th>Urun / Hizmet</th><th>Adet</th><th>Birim fiyat</th><th>KDV</th><th>Toplam</th></tr></thead><tbody>{analysis.lineItems.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.description}</td><td>{item.quantity}</td><td>{item.unitPrice}</td><td>{item.vatRate}</td><td>{item.total}</td></tr>)}</tbody></table></div></section>}
                  <button type="button" className="add-field-button" onClick={addField}><Plus size={16} /> Manuel alan ekle</button>
                </>
              )}
              <div className="form-actions"><button type="button" className="secondary-button" onClick={clearForm}>Temizle</button><button type="submit" className="primary-button" disabled={!analysis.fields.length}><Check size={18} /> Kaydi olustur</button></div>
            </form>
          </div>
        ) : (
          <section className="records-view">
            <div className="summary-row">
              <div className="metric"><span><ReceiptText size={20} /></span><div><small>Toplam kayit</small><strong>{records.length}</strong></div></div>
              <div className="metric"><span className="green"><CircleDollarSign size={20} /></span><div><small>Toplam harcama</small><strong>{money(records.reduce((sum, item) => sum + Number(fieldValue(item, ["totalAmount", "grandTotal", "total"]) || 0), 0).toString())}</strong></div></div>
              <button className="primary-button" onClick={() => setActiveView("new")}><Plus size={18} /> Yeni fis</button>
            </div>
            <div className="records-toolbar"><div className="search-box"><Search size={18} /><input placeholder="Tum dinamik alanlarda ara" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
            {filteredRecords.length ? <div className="table-wrap"><table><thead><tr><th>Belge</th><th>Tarih</th><th>Masraf tipi</th><th>Dinamik alan</th><th>Tutar</th><th></th></tr></thead><tbody>{filteredRecords.map((record) => {
              const company = fieldValue(record, ["companyName", "merchantName", "sellerName"]) || record.documentType;
              return <tr key={record.id}><td><div className="company-cell"><span>{company.slice(0, 1).toUpperCase()}</span><div><strong>{company}</strong><small>{fieldValue(record, ["receiptNumber", "invoiceNumber", "documentNumber"]) || record.fileName}</small></div></div></td><td>{fieldValue(record, ["receiptDate", "documentDate", "date"]) || "-"}</td><td><span className="category-tag">{fieldValue(record, ["expenseType"]) || "Diger"}</span></td><td>{record.fields.length} alan</td><td className="amount">{money(fieldValue(record, ["totalAmount", "grandTotal", "total"]), record.currency)}</td><td><button className="icon-button" title="Kaydi sil" onClick={() => deleteRecord(record.id)}><Trash2 size={17} /></button></td></tr>;
            })}</tbody></table></div> : <div className="empty-state"><span><LayoutDashboard size={32} /></span><h2>Henuz kayit yok</h2><p>Ilk fisinizi gercek AI ile analiz ederek arsivi baslatin.</p><button onClick={() => setActiveView("new")}>Fis ekle <ChevronRight size={17} /></button></div>}
          </section>
        )}
      </section>
    </main>
  );
}
