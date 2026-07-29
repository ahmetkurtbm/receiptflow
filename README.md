# ReceiptFlow

ReceiptFlow, fiş ve fatura görsellerini AI ile okuyup muhasebe alanlarını (tutar, tarih, kalem, KDV vb.) otomatik çıkaran, kullanıcının bu alanları düzenleyebildiği ve tüm kayıtları tek yerde topladığı bir finans asistanı uygulamasıdır.

## Özellikler

- **AI ile fiş/fatura okuma** — yüklenen görselden muhasebe alanlarının otomatik çıkarılması (OCR)
- **Düzenlenebilir alanlar** — AI çıktısı hatalıysa kullanıcı elle düzeltebilir
- **Tek yerde kayıt listesi** — filtreleme ve arama ile tüm fiş/fatura geçmişine erişim
- **Kimlik doğrulama** — GateHub SSO ile giriş, her kullanıcının kayıtları kendisine özel

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Uygulama | Next.js (App Router), TypeScript |
| Kimlik | NextAuth → GateHub OIDC sağlayıcısı |
| Veri | PostgreSQL |

## Canlı Demo

[receiptflow-eta.vercel.app](https://receiptflow-eta.vercel.app/)
