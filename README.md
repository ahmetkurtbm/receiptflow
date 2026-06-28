# ReceiptFlow

Yuklenen fis gorsellerinden muhasebe alanlarini AI ile cikaran, kullanicinin kontrol etmesine izin veren ve kayitlari tarayicida saklayan Next.js uygulamasi.

## Kurulum

```bash
npm install
npm run dev
```

Uygulama yalnizca gercek Google Gemini analizi kullanir; demo veya sahte fis verisi uretmez. `.env.example` dosyasini `.env.local` olarak kopyalayip Gemini API anahtarinizi ekleyin.

## Ozellikler

- Gorsel veya PDF fis yukleme
- Google Gemini ile gercek gorsel analizi
- Fis icerigine gore dinamik alanlar ve urun satirlari
- Her muhasebe alani icin AI tarafindan uretilen aciklama
- AI guven skoru ve duzenlenebilir alanlar
- Tarayici `localStorage` alaninda kalici kayit listesi
- Firma, fis no ve masraf tipine gore arama
