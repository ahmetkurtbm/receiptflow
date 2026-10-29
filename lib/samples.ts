// Example analyses in exactly the shape the AI route returns. The demo uses
// them when no AI key is configured (the public Vercel deployment): visitors
// can walk through review → save → records without uploading a real receipt.

export type FieldCategory = "merchant" | "document" | "tax" | "payment" | "classification" | "other";
export type FieldDataType = "text" | "number" | "currency" | "date" | "percentage";
export type DynamicField = {
  id: string; key: string; label: string; value: string; description: string;
  category: FieldCategory; dataType: FieldDataType; confidence: number; source: "receipt" | "inferred";
};
export type LineItem = { description: string; quantity: string; unitPrice: string; vatRate: string; total: string };
export type ReceiptAnalysis = {
  documentType: string; currency: string; summary: string; confidence: number;
  fields: DynamicField[]; lineItems: LineItem[]; provider?: string; model?: string;
};

type Field = [key: string, label: string, value: string, category: FieldCategory, dataType: FieldDataType, description: string, source?: "inferred"];

function analysis(documentType: string, summary: string, confidence: number, fields: Field[], lineItems: LineItem[]): ReceiptAnalysis {
  return {
    documentType, currency: "TRY", summary, confidence, lineItems, provider: "Örnek veri", model: "demo",
    fields: fields.map(([key, label, value, category, dataType, description, source], index) => ({
      id: `${key}-${index}`, key, label, value, category, dataType, description,
      confidence: source ? 80 : 90 + (index % 3) * 3, source: source ?? "receipt",
    })),
  };
}

export const SAMPLE_ANALYSES: { fileName: string; analysis: ReceiptAnalysis }[] = [
  {
    fileName: "ornek-market-fisi.jpg",
    analysis: analysis("Perakende satış fişi", "Market alışverişine ait, iki KDV oranı içeren perakende satış fişi.", 94, [
      ["companyName", "Firma unvanı", "Örnek Gıda Market A.Ş.", "merchant", "text", "Satışı yapan işletmenin ticari unvanı."],
      ["taxNumber", "Vergi numarası", "1234567890", "merchant", "text", "Satıcının vergi kimlik numarası."],
      ["receiptNumber", "Fiş numarası", "0042", "document", "text", "Kasanın verdiği sıra numarası."],
      ["receiptDate", "Tarih", "2026-10-21", "document", "date", "Satışın yapıldığı gün."],
      ["vatRate1", "KDV %1 tutarı", "1.24", "tax", "currency", "Temel gıda ürünlerine uygulanan KDV."],
      ["vatRate20", "KDV %20 tutarı", "21.50", "tax", "currency", "Diğer ürünlere uygulanan KDV."],
      ["totalAmount", "Genel toplam", "253.40", "tax", "currency", "Ödenen toplam tutar."],
      ["paymentMethod", "Ödeme yöntemi", "Kredi kartı", "payment", "text", "Ödemenin yapıldığı araç."],
      ["expenseType", "Masraf türü", "Mutfak ve ikram", "classification", "text", "Belge içeriğinden çıkarılan masraf kategorisi.", "inferred"],
      ["expenseBranch", "Masraf yeri", "", "classification", "text", "Belgede şube bilgisi yok.", "inferred"],
    ], [
      { description: "Ekmek", quantity: "4", unitPrice: "15.00", vatRate: "%1", total: "60.00" },
      { description: "Kahve 250 g", quantity: "1", unitPrice: "129.00", vatRate: "%20", total: "129.00" },
      { description: "Kâğıt havlu", quantity: "1", unitPrice: "64.40", vatRate: "%20", total: "64.40" },
    ]),
  },
  {
    fileName: "ornek-akaryakit-fisi.jpg",
    analysis: analysis("Akaryakıt fişi", "Şirket aracı için alınan benzine ait akaryakıt istasyonu fişi.", 91, [
      ["companyName", "Firma unvanı", "Örnek Petrol Ltd. Şti.", "merchant", "text", "Akaryakıt istasyonunun unvanı."],
      ["address", "Adres", "Merkez Mah. İstasyon Cad. No:5, Ankara", "merchant", "text", "İstasyonun adresi."],
      ["receiptDate", "Tarih", "2026-10-18", "document", "date", "Satış tarihi."],
      ["plateNumber", "Plaka", "06 ABC 123", "document", "text", "Yakıt alınan aracın plakası."],
      ["vatRate20", "KDV %20 tutarı", "250.00", "tax", "currency", "Akaryakıt KDV'si."],
      ["totalAmount", "Genel toplam", "1500.00", "tax", "currency", "Ödenen toplam tutar."],
      ["paymentMethod", "Ödeme yöntemi", "Şirket kartı", "payment", "text", "Ödeme aracı."],
      ["expenseType", "Masraf türü", "Ulaşım - akaryakıt", "classification", "text", "Belge içeriğinden çıkarılan masraf kategorisi.", "inferred"],
      ["expenseBranch", "Masraf yeri", "Ankara", "classification", "text", "Adresten çıkarılan masraf yeri.", "inferred"],
    ], [
      { description: "Kurşunsuz benzin 95", quantity: "30.5 L", unitPrice: "49.18", vatRate: "%20", total: "1500.00" },
    ]),
  },
  {
    fileName: "ornek-kirtasiye-faturasi.jpg",
    analysis: analysis("e-Arşiv fatura", "Ofis için alınan kırtasiye malzemelerine ait e-Arşiv fatura.", 96, [
      ["companyName", "Firma unvanı", "Örnek Kırtasiye San. Tic.", "merchant", "text", "Faturayı kesen işletme."],
      ["invoiceNumber", "Fatura numarası", "ORN2026000001234", "document", "text", "e-Arşiv fatura numarası."],
      ["receiptDate", "Tarih", "2026-10-02", "document", "date", "Fatura tarihi."],
      ["subtotal", "Ara toplam", "750.00", "tax", "currency", "KDV hariç tutar."],
      ["vatRate20", "KDV %20 tutarı", "150.00", "tax", "currency", "Faturadaki KDV."],
      ["totalAmount", "Genel toplam", "900.00", "tax", "currency", "Ödenecek toplam."],
      ["expenseType", "Masraf türü", "Ofis - kırtasiye", "classification", "text", "Belge içeriğinden çıkarılan masraf kategorisi.", "inferred"],
      ["expenseBranch", "Masraf yeri", "", "classification", "text", "Belgede şube bilgisi yok.", "inferred"],
    ], [
      { description: "A4 fotokopi kâğıdı (koli)", quantity: "2", unitPrice: "300.00", vatRate: "%20", total: "600.00" },
      { description: "Toner", quantity: "1", unitPrice: "150.00", vatRate: "%20", total: "150.00" },
    ]),
  },
];

/** Fixed expense groups; kept in the browser like the records themselves. */
export const RECEIPT_GROUPS = [
  { id: "genel", code: "GENEL", name: "Genel Masraflar", description: "Varsayılan masraf ve fiş grubu" },
  { id: "seyahat", code: "SEYAHAT", name: "Seyahat", description: "Ulaşım, konaklama ve seyahat giderleri" },
  { id: "ofis", code: "OFIS", name: "Ofis", description: "Kırtasiye, ekipman ve ofis giderleri" },
];
