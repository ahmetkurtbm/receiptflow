import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const fieldSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    key: { type: "string" },
    label: { type: "string" },
    value: { type: "string" },
    description: { type: "string" },
    category: { type: "string", enum: ["merchant", "document", "tax", "payment", "classification", "other"] },
    dataType: { type: "string", enum: ["text", "number", "currency", "date", "percentage"] },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    source: { type: "string", enum: ["receipt", "inferred"] },
  },
  required: ["key", "label", "value", "description", "category", "dataType", "confidence", "source"],
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: { type: "string" },
    currency: { type: "string" },
    summary: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    fields: { type: "array", items: fieldSchema },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: "string" },
          quantity: { type: "string" },
          unitPrice: { type: "string" },
          vatRate: { type: "string" },
          total: { type: "string" },
        },
        required: ["description", "quantity", "unitPrice", "vatRate", "total"],
      },
    },
  },
  required: ["documentType", "currency", "summary", "confidence", "fields", "lineItems"],
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gercek AI analizi icin GEMINI_API_KEY tanimlanmamis. .env.local dosyasina anahtarinizi ekleyip sunucuyu yeniden baslatin.", code: "MISSING_API_KEY" },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("receipt");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Bir fis gorseli secmelisiniz." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "AI gorsel analizi icin JPG, PNG veya WEBP yukleyin." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Dosya boyutu 10 MB'dan kucuk olmalidir." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const prompt = `Gorseldeki fis, fatura veya harcama belgesini Turkce muhasebe kaydi icin ayrintili incele.

KURALLAR:
- fields dizisini belgenin gercek icerigine gore dinamik olustur. Sabit sayida alan dondurme.
- Belgede gorulen her anlamli ust bilgiyi ayri alan yap: firma unvani, vergi numarasi, fis/fatura no, tarih-saat, adres, sube/kasa/terminal no, odeme yontemi, ara toplam, KDV oranlari ve tutarlari, indirim, yuvarlama, toplam, para birimi, banka referansi ve benzeri.
- Ayni belgede birden cok KDV orani varsa her birini ayri alan olarak ekle.
- key degerlerini benzersiz, kisa camelCase kimlikler olarak yaz. label ve description Turkce olsun.
- Belgede gorunmeyen bilgiyi uydurma. Okunamayan alanlari fields dizisine ekleme.
- Yalnizca expenseType ve expenseBranch alanlari belge iceriginden mantikli sekilde siniflandirilabilir. Bunlarda source=inferred kullan; sube cikarilamiyorsa value bos olsun.
- expenseType alanini mutlaka ekle ve harcamayi kisa bir muhasebe kategorisine ayir.
- expenseBranch alanini mutlaka ekle; belgede yer/sube bilgisi varsa kullan, yoksa bos birak.
- Tutar ve sayi degerlerinde para sembolu kullanma, ondalik ayiraci nokta olsun. Tarihi YYYY-MM-DD biciminde ver.
- Urun/hizmet satirlari okunabiliyorsa lineItems dizisine ekle; okunamiyorsa bos dizi dondur.
- description her alanin muhasebe kaydindaki anlamini aciklasin. confidence alan bazinda okuma guvenidir.
- summary belgenin amacini tek, kisa Turkce cumleyle anlatsin.`;

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { inline_data: { mime_type: file.type, data: bytes.toString("base64") } },
          { text: prompt },
        ] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: responseSchema,
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini response error:", response.status, detail);
      const message = response.status === 401
        ? "Gemini API anahtari gecersiz. .env.local dosyasini kontrol edin."
        : response.status === 403
          ? "Gemini API anahtari icin erisim reddedildi. Anahtar izinlerini kontrol edin."
        : response.status === 429
          ? "Gemini kullanim kotasi veya hiz siniri asildi. Google AI Studio kotanizi kontrol edin."
          : "Belge AI tarafindan analiz edilemedi. Daha net bir fotografla tekrar deneyin.";
      return NextResponse.json({ error: message }, { status: response.status === 401 ? 401 : 502 });
    }

    const result = await response.json();
    const outputText = result.candidates?.[0]?.content?.parts
      ?.find((part: { text?: string }) => typeof part.text === "string")?.text;
    if (!outputText) return NextResponse.json({ error: "AI yaniti islenemedi." }, { status: 502 });

    const parsed = JSON.parse(outputText);
    return NextResponse.json({
      ...parsed,
      fields: parsed.fields.map((field: Record<string, unknown>, index: number) => ({ ...field, id: `${String(field.key)}-${index}` })),
      provider: "Google Gemini",
      model,
    });
  } catch (error) {
    console.error("Receipt extraction error:", error);
    return NextResponse.json({ error: "Fis islenirken beklenmeyen bir hata olustu." }, { status: 500 });
  }
}
