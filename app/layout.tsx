import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReceiptFlow | Akıllı Fiş Yönetimi",
  description: "Fişlerinizi yapay zekâ ile analiz edin, kontrol edin ve kaydedin.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
