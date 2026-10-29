# ReceiptFlow

ReceiptFlow, fiş ve fatura görsellerini AI ile okuyup muhasebe alanlarını (tutar, tarih, kalem, KDV vb.) otomatik çıkaran, kullanıcının bu alanları düzenleyebildiği ve tüm kayıtları tek yerde topladığı bir finans asistanı uygulamasıdır.

## Özellikler

- **AI ile fiş/fatura okuma** — yüklenen görselden muhasebe alanlarının otomatik çıkarılması (Google Gemini, yapılandırılmış JSON çıktısı)
- **Dinamik alanlar** — sabit form yok; alanlar belgenin içeriğine göre oluşur, KDV kırılımı ve ürün satırları dahil
- **Düzenlenebilir sonuç** — AI çıktısı hatalıysa kullanıcı düzeltir, alan ekler veya siler
- **Toplu yükleme** — birden fazla fiş kuyruğa alınıp sırayla analiz edilir
- **Kayıt listesi** — arama, para birimine göre toplamlar, JSON olarak dışa aktarma
- **Hesap gerektirmez** — kayıtlar tarayıcıda (localStorage) tutulur

## Çalışma modları

| Mod | Ne zaman | Davranış |
|---|---|---|
| **Demo** | `GEMINI_API_KEY` boşken (Vercel) | Görsel analizi yerine hazır örnek fiş analizleri yüklenir; inceleme, düzenleme ve kayıt adımları aynen çalışır |
| **Gerçek** | `GEMINI_API_KEY` tanımlıyken (yerel) | Yüklenen görseller Gemini ile analiz edilir |

Sunucu tarafında yalnızca `/api/receipts/extract` vardır; API anahtarı tarayıcıya gönderilemeyeceği için
analiz isteği sunucudan yapılır. Uç herkese açık olduğu için IP başına saatte 10, sunucu örneği başına
günde 200 analizle sınırlıdır (`RECEIPTFLOW_IP_HOURLY_LIMIT`, `RECEIPTFLOW_DAILY_LIMIT`). Asıl güvence
anahtarın kendisine Google AI Studio'da koyulan harcama sınırıdır; anahtarı Vercel'e eklemeden önce onu ayarlayın.

## Vercel'de gerçek analizi açmak

Vercel'deki sürüm varsayılan olarak demo modunda çalışır. Gerçek fiş analizi için:

1. Google AI Studio'da API anahtarına **harcama sınırı** koyun (uç herkese açık olduğundan asıl koruma budur).
2. Vercel → proje → Settings → Environment Variables → `GEMINI_API_KEY` ekleyin (Production).
3. Deployments → son dağıtım → **Redeploy**.

Başka ortam değişkeni gerekmez; `GEMINI_MODEL` (varsayılan `gemini-2.5-flash`), `RECEIPTFLOW_IP_HOURLY_LIMIT` ve
`RECEIPTFLOW_DAILY_LIMIT` isteğe bağlıdır.

## Kurulum

```bash
npm install
echo GEMINI_API_KEY=... > .env.local   # boş bırakılırsa demo modu
npm run dev
```

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Uygulama | Next.js (App Router), TypeScript |
| Yapay zekâ | Google Gemini (görsel → JSON şema) |
| Veri | Tarayıcı (localStorage) |

## Canlı Demo

[receiptflow-ahmetkurt.vercel.app](https://receiptflow-ahmetkurt.vercel.app/)
