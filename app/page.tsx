"use client";

import {
  AlertCircle, BarChart3, CalendarRange, Check, ChevronRight, CircleDollarSign,
  CloudUpload, Download, Eye, FileCheck2, LayoutDashboard, LoaderCircle, Plus,
  ReceiptText, Search, Settings, Sparkles, Tag, Trash2, X
} from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminPanel from "./components/AdminPanel";

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
type SavedReceipt = ReceiptAnalysis & {
  id: string; createdAt: string; fileName: string; totalAmount: number; savedCurrency: string;
  groupId?: string | null; groupName?: string | null;
};
type ReceiptGroup = { id: string; code: string; name: string; description: string };
type BatchItem = {
  id: string; file: File; preview: string; status: "ready" | "analyzing" | "done" | "error" | "saved";
  analysis?: ReceiptAnalysis; error?: string;
};

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

const normalizeCurrency = (currency?: string) => {
  const value = (currency || "TRY").trim().toUpperCase();
  if (["TL", "₺", "TURK LIRASI", "TURK LIRASI"].includes(value)) return "TRY";
  if (value === "$" || value === "US DOLLAR") return "USD";
  if (value === "€" || value === "EURO") return "EUR";
  return value || "TRY";
};

const parseAmount = (raw?: string) => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9,.-]/g, "");
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = cleaned.split(thousands).join("").replace(decimal, ".");
  } else if (comma >= 0) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if ((cleaned.match(/\./g) || []).length > 1) {
    const parts = cleaned.split(".");
    normalized = `${parts.slice(0, -1).join("")}.${parts.at(-1)}`;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};

const getReceiptTotal = (analysis: ReceiptAnalysis) => {
  const exactKeys = ["totalAmount", "grandTotal", "total", "amountDue", "payableAmount", "netTotal", "overallTotal"];
  const exact = analysis.fields.find((field) => exactKeys.includes(field.key));
  if (exact) return parseAmount(exact.value);
  const inferred = analysis.fields.find((field) => {
    const text = `${field.key} ${field.label}`.toLocaleLowerCase("tr-TR");
    return text.includes("genel toplam") || text.includes("odenecek toplam") || text.includes("grand total");
  });
  return parseAmount(inferred?.value);
};

const money = (value: number | string, currency = "TRY") => {
  const amount = typeof value === "number" ? value : parseAmount(value);
  const normalizedCurrency = normalizeCurrency(currency);
  try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: normalizedCurrency }).format(amount); }
  catch { return `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${normalizedCurrency}`; }
};

export default function Home() {
  const [activeView, setActiveView] = useState<"new" | "records" | "admin">("new");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState<ReceiptAnalysis>(emptyAnalysis);
  const [records, setRecords] = useState<SavedReceipt[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SavedReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; setup?: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [databaseActive, setDatabaseActive] = useState(false);
  const [receiptGroups, setReceiptGroups] = useState<ReceiptGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("receiptflow-dynamic-records");
      if (!stored) return;
      const parsed = JSON.parse(stored) as Array<Partial<SavedReceipt> & ReceiptAnalysis>;
      if (!Array.isArray(parsed)) return;
      const migrated = parsed.map((record) => ({
        ...record,
        totalAmount: typeof record.totalAmount === "number" ? record.totalAmount : getReceiptTotal(record),
        savedCurrency: normalizeCurrency(record.savedCurrency || record.currency),
      })) as SavedReceipt[];
      setRecords(migrated);
      localStorage.setItem("receiptflow-dynamic-records", JSON.stringify(migrated));
    } catch {
      setMessage({ type: "error", text: "Yerel kayitlar okunamadi. Yeni kayitlar guvenle eklenebilir." });
    }
  }, []);
  useEffect(() => {
    Promise.all([
      fetch("/api/receipts").then((response) => response.json()),
      fetch("/api/receipt-groups").then((response) => response.json()),
    ]).then(([receiptData, groupData]) => {
      setDatabaseActive(Boolean(receiptData.configured));
      if (receiptData.configured && Array.isArray(receiptData.records)) {
        setRecords(receiptData.records);
        localStorage.setItem("receiptflow-dynamic-records", JSON.stringify(receiptData.records));
      }
      if (Array.isArray(groupData.groups)) {
        setReceiptGroups(groupData.groups);
        if (groupData.groups.length) setSelectedGroupId(groupData.groups[0].id);
      }
    }).catch(() => setDatabaseActive(false));
  }, []);

  const selectBatchItem = (item: BatchItem) => {
    setCurrentBatchId(item.id); setFile(item.file); setPreview(item.preview);
    setAnalysis(item.analysis || emptyAnalysis()); setMessage(item.error ? { type: "error", text: item.error } : null);
  };

  const chooseFiles = (selected: File[]) => {
    const valid = selected.filter((item) => item.type.startsWith("image/") && item.size <= 10 * 1024 * 1024);
    if (!valid.length) { setMessage({ type: "error", text: "JPG, PNG veya WEBP biciminde, en fazla 10 MB gorseller secin." }); return; }
    batchItems.forEach((item) => URL.revokeObjectURL(item.preview));
    const nextItems: BatchItem[] = valid.map((item) => ({ id: crypto.randomUUID(), file: item, preview: URL.createObjectURL(item), status: "ready" }));
    setBatchItems(nextItems); selectBatchItem(nextItems[0]);
    setMessage(selected.length !== valid.length ? { type: "error", text: `${selected.length - valid.length} gecersiz dosya kuyruga eklenmedi.` } : null);
  };

  const extractReceipt = async () => {
    if (!batchItems.length) return;
    setLoading(true); setMessage(null);
    let successCount = 0;
    let firstSuccess: BatchItem | null = null;
    for (const item of batchItems.filter((entry) => entry.status !== "saved")) {
      setBatchItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "analyzing", error: undefined } : entry));
      const form = new FormData(); form.append("receipt", item.file);
      try {
        const response = await fetch("/api/receipts/extract", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Fis analiz edilemedi.");
        const completed: BatchItem = { ...item, status: "done", analysis: result };
        setBatchItems((current) => current.map((entry) => entry.id === item.id ? completed : entry));
        if (!firstSuccess) firstSuccess = completed;
        successCount += 1;
      } catch (error) {
        const errorText = error instanceof Error ? error.message : "Fis analiz edilemedi.";
        setBatchItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "error", error: errorText } : entry));
      }
    }
    if (firstSuccess) selectBatchItem(firstSuccess);
    setMessage(successCount ? { type: "success", text: `${successCount} fis Gemini ile analiz edildi. Sonuclari sirayla kontrol edip kaydedin.` } : { type: "error", text: "Kuyruktaki fisler analiz edilemedi." });
    setLoading(false);
  };

  const updateField = (id: string, property: keyof DynamicField, value: string) => {
    setAnalysis((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === id
        ? { ...field, [property]: property === "confidence" ? Number(value) : value }
        : field),
    }));
    setBatchItems((current) => current.map((item) => item.id === currentBatchId && item.analysis ? { ...item, analysis: { ...item.analysis, fields: item.analysis.fields.map((field) => field.id === id ? { ...field, [property]: property === "confidence" ? Number(value) : value } : field) } } : item));
  };
  const removeField = (id: string) => {
    setAnalysis((current) => ({ ...current, fields: current.fields.filter((field) => field.id !== id) }));
    setBatchItems((current) => current.map((item) => item.id === currentBatchId && item.analysis ? { ...item, analysis: { ...item.analysis, fields: item.analysis.fields.filter((field) => field.id !== id) } } : item));
  };
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

  const saveReceipt = async (event: FormEvent) => {
    event.preventDefault();
    if (!analysis.fields.length) { setMessage({ type: "error", text: "Kaydetmeden once fisi AI ile analiz edin." }); return; }
    const totalAmount = getReceiptTotal(analysis);
    if (totalAmount <= 0) { setMessage({ type: "error", text: "Fis toplam tutari bulunamadi. Toplam alanini kontrol edin." }); return; }
    const next: SavedReceipt = {
      ...analysis, id: crypto.randomUUID(), createdAt: new Date().toISOString(), fileName: file?.name || "Belge",
      totalAmount, savedCurrency: normalizeCurrency(analysis.currency), groupId: selectedGroupId || null,
      groupName: receiptGroups.find((group) => group.id === selectedGroupId)?.name || null,
    };
    let databaseSaveFailed = false;
    if (databaseActive) {
      try {
        const response = await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        next.id = result.id; next.createdAt = result.createdAt;
      } catch {
        databaseSaveFailed = true;
        setMessage({ type: "error", text: "Veritabani kaydi basarisiz; fis yerel onbellege kaydedildi." });
      }
    }
    const updated = [next, ...records]; setRecords(updated);
    localStorage.setItem("receiptflow-dynamic-records", JSON.stringify(updated));
    setBatchItems((current) => current.map((item) => item.id === currentBatchId ? { ...item, status: "saved" } : item));
    if (!databaseSaveFailed) setMessage({ type: "success", text: databaseActive ? "Fis PostgreSQL ve yerel onbellege kaydedildi." : "Fis yerel onbellege kaydedildi." });
    const nextBatchItem = batchItems.find((item) => item.id !== currentBatchId && item.status === "done");
    if (nextBatchItem) selectBatchItem(nextBatchItem);
    else setTimeout(() => setActiveView("records"), 500);
  };
  const clearForm = () => {
    batchItems.forEach((item) => URL.revokeObjectURL(item.preview));
    setBatchItems([]); setCurrentBatchId(""); setFile(null); setPreview(""); setAnalysis(emptyAnalysis()); setMessage(null);
  };
  const deleteRecord = async (id: string) => {
    if (databaseActive) {
      try { await fetch(`/api/receipts?id=${encodeURIComponent(id)}`, { method: "DELETE" }); }
      catch { setMessage({ type: "error", text: "Veritabani kaydi silinemedi." }); return; }
    }
    const updated = records.filter((record) => record.id !== id); setRecords(updated);
    localStorage.setItem("receiptflow-dynamic-records", JSON.stringify(updated));
    if (selectedRecord?.id === id) setSelectedRecord(null);
  };

  const exportRecords = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `receiptflow-kayitlar-${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); URL.revokeObjectURL(url);
  };

  const filteredRecords = useMemo(() => records.filter((record) =>
    `${record.summary} ${record.documentType} ${record.fields.map((field) => field.value).join(" ")}`
      .toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))
  ), [records, search]);

  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    records.forEach((record) => totals.set(record.savedCurrency, (totals.get(record.savedCurrency) || 0) + record.totalAmount));
    return [...totals.entries()].map(([currency, total]) => ({ currency, total }));
  }, [records]);
  const primaryCurrency = totalsByCurrency.find((item) => item.currency === "TRY")?.currency || totalsByCurrency[0]?.currency || "TRY";
  const primaryTotal = totalsByCurrency.find((item) => item.currency === primaryCurrency)?.total || 0;
  const primaryRecords = records.filter((record) => record.savedCurrency === primaryCurrency);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = primaryRecords
    .filter((record) => record.createdAt.slice(0, 7) === currentMonth)
    .reduce((sum, record) => sum + record.totalAmount, 0);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><ReceiptText size={22} /></span><span>ReceiptFlow</span></div>
        <nav aria-label="Ana menu">
          <button className={activeView === "new" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("new")}><Plus size={19} /><span>Yeni fis</span></button>
          <button className={activeView === "records" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("records")}><FileCheck2 size={19} /><span>Kayitlar</span><b>{records.length}</b></button>
          <button className={activeView === "admin" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("admin")}><Settings size={19} /><span>Admin</span></button>
        </nav>
        <div className="sidebar-foot"><Sparkles size={18} /><div><strong>Google Gemini</strong><span>Dinamik belge analizi</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">AI MASRAF YONETIMI</p><h1>{activeView === "new" ? "Dinamik fis analizi" : activeView === "records" ? "Fis kayitlari" : "Admin yonetimi"}</h1></div>
          <div className="status-pill"><span /> {databaseActive ? "PostgreSQL bagli" : "Yerel kayit modu"}</div>
        </header>

        {activeView === "new" ? (
          <div className="new-receipt-layout">
            <section className="upload-column">
              <div className="section-heading"><div><span className="step">1</span><h2>Fis gorselini yukleyin</h2></div><p>JPG, PNG, WEBP · En fazla 10 MB</p></div>
              {!file ? (
                <button className={dragging ? "dropzone dragging" : "dropzone"} onClick={() => fileInput.current?.click()}
                  onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                  onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); chooseFiles(Array.from(e.dataTransfer.files)); }}>
                  <span className="upload-icon"><CloudUpload size={30} /></span><strong>Fisleri buraya birakin</strong><span>Birden fazla JPG, PNG veya WEBP secebilirsiniz</span><em>Gorselleri sec</em>
                </button>
              ) : (
                <div className="preview-area">
                  <img src={preview} alt="Yuklenen fis onizlemesi" />
                  <button className="remove-file" title="Dosyayi kaldir" onClick={clearForm}><X size={18} /></button>
                  <div className="file-caption"><FileCheck2 size={18} /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div></div>
                </div>
              )}
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e: ChangeEvent<HTMLInputElement>) => chooseFiles(Array.from(e.target.files || []))} />
              <button className="analyze-button" disabled={!batchItems.length || loading} onClick={extractReceipt}>
                {loading ? <><LoaderCircle className="spin" size={19} /> Gemini kuyrugu analiz ediyor</> : <><Sparkles size={19} /> {batchItems.length > 1 ? `${batchItems.length} fisi analiz et` : "Gemini ile analiz et"}</>}
              </button>
              <div className="privacy-note"><Check size={16} /><span>Alanlar belgenin icerigine gore otomatik olusur.</span></div>
              {batchItems.length > 0 && <div className="batch-queue"><header><strong>Yukleme kuyrugu</strong><span>{batchItems.filter((item) => item.status === "saved").length}/{batchItems.length} kaydedildi</span></header>{batchItems.map((item, index) => <button key={item.id} className={item.id === currentBatchId ? "batch-item active" : "batch-item"} onClick={() => selectBatchItem(item)}><span className={`batch-status ${item.status}`}>{item.status === "analyzing" ? <LoaderCircle className="spin" size={14} /> : item.status === "done" || item.status === "saved" ? <Check size={14} /> : item.status === "error" ? <AlertCircle size={14} /> : index + 1}</span><span><strong>{item.file.name}</strong><small>{item.status === "ready" ? "Analiz bekliyor" : item.status === "analyzing" ? "Analiz ediliyor" : item.status === "done" ? "Kontrol ve kayit bekliyor" : item.status === "saved" ? "Kaydedildi" : item.error}</small></span></button>)}</div>}
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
                  {receiptGroups.length > 0 && <label className="receipt-group-select"><span>Fis tipi grubu</span><select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>{receiptGroups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select><small>Admin tarafindan bu kullaniciya atanan gruplar.</small></label>}
                  <button type="button" className="add-field-button" onClick={addField}><Plus size={16} /> Manuel alan ekle</button>
                </>
              )}
              <div className="form-actions"><button type="button" className="secondary-button" onClick={clearForm}>Temizle</button><button type="submit" className="primary-button" disabled={!analysis.fields.length}><Check size={18} /> Kaydi olustur</button></div>
            </form>
          </div>
        ) : activeView === "records" ? (
          <section className="records-view">
            <div className="summary-row">
              <div className="metric"><span><ReceiptText size={20} /></span><div><small>Toplam kayit</small><strong>{records.length}</strong></div></div>
              <div className="metric total-metric"><span className="green"><CircleDollarSign size={20} /></span><div><small>Toplam harcama</small><strong>{money(primaryTotal, primaryCurrency)}</strong>{totalsByCurrency.length > 1 && <em>{totalsByCurrency.filter((item) => item.currency !== primaryCurrency).map((item) => money(item.total, item.currency)).join(" + ")}</em>}</div></div>
              <div className="metric"><span className="blue"><CalendarRange size={20} /></span><div><small>Bu ay</small><strong>{money(currentMonthTotal, primaryCurrency)}</strong></div></div>
              <div className="metric"><span className="violet"><BarChart3 size={20} /></span><div><small>Fis ortalamasi</small><strong>{money(primaryRecords.length ? primaryTotal / primaryRecords.length : 0, primaryCurrency)}</strong></div></div>
              <div className="records-actions"><button className="secondary-button" onClick={exportRecords} disabled={!records.length} title="Kayitlari JSON olarak indir"><Download size={18} /> Yedekle</button><button className="primary-button" onClick={() => setActiveView("new")}><Plus size={18} /> Yeni fis</button></div>
            </div>
            <div className="records-toolbar"><div className="search-box"><Search size={18} /><input placeholder="Tum dinamik alanlarda ara" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
            {filteredRecords.length ? <div className="table-wrap"><table><thead><tr><th>Belge</th><th>Tarih</th><th>Fis grubu</th><th>Dinamik alan</th><th>Tutar</th><th></th></tr></thead><tbody>{filteredRecords.map((record) => {
              const company = fieldValue(record, ["companyName", "merchantName", "sellerName"]) || record.documentType;
              return <tr key={record.id}><td><div className="company-cell"><span>{company.slice(0, 1).toUpperCase()}</span><div><strong>{company}</strong><small>{fieldValue(record, ["receiptNumber", "invoiceNumber", "documentNumber"]) || record.fileName}</small></div></div></td><td>{fieldValue(record, ["receiptDate", "documentDate", "date", "transactionDateTime"]) || "-"}</td><td><span className="category-tag">{record.groupName || fieldValue(record, ["expenseType"]) || "Diger"}</span></td><td>{record.fields.length} alan</td><td className="amount">{money(record.totalAmount, record.savedCurrency)}</td><td><div className="row-actions"><button className="icon-button" title="Kayit ayrintilari" onClick={() => setSelectedRecord(record)}><Eye size={17} /></button><button className="icon-button" title="Kaydi sil" onClick={() => deleteRecord(record.id)}><Trash2 size={17} /></button></div></td></tr>;
            })}</tbody></table></div> : <div className="empty-state"><span><LayoutDashboard size={32} /></span><h2>Henuz kayit yok</h2><p>Ilk fisinizi gercek AI ile analiz ederek arsivi baslatin.</p><button onClick={() => setActiveView("new")}>Fis ekle <ChevronRight size={17} /></button></div>}

            {selectedRecord && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedRecord(null)}>
              <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-detail-title" onClick={(event) => event.stopPropagation()}>
                <header><div><p className="eyebrow">YEREL FIS KAYDI</p><h2 id="record-detail-title">{fieldValue(selectedRecord, ["companyName", "merchantName", "sellerName"]) || selectedRecord.documentType}</h2></div><button className="icon-button" title="Kapat" onClick={() => setSelectedRecord(null)}><X size={20} /></button></header>
                <div className="record-total"><div><small>Kayit tarihi</small><strong>{new Date(selectedRecord.createdAt).toLocaleString("tr-TR")}</strong></div><div><small>Fis grubu</small><strong>{selectedRecord.groupName || fieldValue(selectedRecord, ["expenseType"]) || "Diger"}</strong></div><div><small>Fis toplami</small><strong>{money(selectedRecord.totalAmount, selectedRecord.savedCurrency)}</strong></div></div>
                <div className="detail-fields">{selectedRecord.fields.map((field) => <div key={field.id}><small>{field.label}</small><strong>{field.value || "-"}</strong><p>{field.description}</p></div>)}</div>
                {selectedRecord.lineItems.length > 0 && <div className="line-table modal-lines"><table><thead><tr><th>Urun / Hizmet</th><th>Adet</th><th>Birim fiyat</th><th>KDV</th><th>Toplam</th></tr></thead><tbody>{selectedRecord.lineItems.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.description}</td><td>{item.quantity}</td><td>{item.unitPrice}</td><td>{item.vatRate}</td><td>{item.total}</td></tr>)}</tbody></table></div>}
              </section>
            </div>}
          </section>
        ) : <AdminPanel />}
      </section>
    </main>
  );
}
