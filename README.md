# ReceiptFlow

## GateHub ile giriş

ReceiptFlow, kullanıcı oturumlarını GateHub üzerinden OpenID Connect ile alır.
GateHub panelinde yeni bir OAuth istemcisi oluştururken callback adresi olarak
şunu kullanın:

```text
http://localhost:3001/api/auth/callback/gatehub
```

Oluşan değerleri `.env.local` dosyasına ekleyin:

```env
AUTH_SECRET="en-az-32-karakterlik-rastgele-bir-deger"
AUTH_URL="http://localhost:3001"
GATEHUB_ISSUER="http://localhost:3000/api/auth"
GATEHUB_CLIENT_ID="GateHub-panelinden-gelen-client-id"
GATEHUB_CLIENT_SECRET="GateHub-panelinden-gelen-client-secret"
```

GateHub `3000`, ReceiptFlow ise `3001` portunda çalışmalıdır.

Yuklenen fis gorsellerinden muhasebe alanlarini AI ile cikaran, kullanicinin kontrol etmesine izin veren ve kayitlari tarayicida saklayan Next.js uygulamasi.

## Kurulum

```bash
npm install
npm run dev
```

Uygulama yalnizca gercek Google Gemini analizi kullanir; demo veya sahte fis verisi uretmez. `.env.example` dosyasini `.env.local` olarak kopyalayip Gemini API anahtarinizi ekleyin.

## PostgreSQL

```bash
docker compose up -d
npm run db:init
```

PostgreSQL kullanmak icin `.env.local` dosyasina asagidaki degeri ekleyin:

```env
DATABASE_URL=postgresql://receiptflow:receiptflow@localhost:5432/receiptflow
NEXT_PUBLIC_RECEIPTFLOW_USER_ID=local-user
```

`NEXT_PUBLIC_RECEIPTFLOW_USER_ID`, ana projedeki kullanici kimligini temsil eder. Entegrasyon sirasinda sunucu isteklerinde `x-receiptflow-user-id` header'i gondererek bu degeri kullanici bazinda degistirebilirsiniz. ReceiptFlow dahili login veya parola yonetmez; admin ekraninin erisim kontrolu ana projeye aittir.

## Ozellikler

- Gorsel veya PDF fis yukleme
- Google Gemini ile gercek gorsel analizi
- Fis icerigine gore dinamik alanlar ve urun satirlari
- Her muhasebe alani icin AI tarafindan uretilen aciklama
- AI guven skoru ve duzenlenebilir alanlar
- Tarayici `localStorage` alaninda kalici kayit listesi
- Firma, fis no ve masraf tipine gore arama
- PostgreSQL veya otomatik localStorage yedegi
- Harici kullanici kimligiyle entegrasyon
- Kullanici bazli fis tipi gruplari ve admin ekrani
- Toplu fis gorseli analiz kuyrugu
