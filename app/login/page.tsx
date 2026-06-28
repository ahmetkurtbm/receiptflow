import { FileText, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { auth, isGateHubConfigured, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const configured = isGateHubConfigured();

  return (
    <main className="login-page">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <section className="login-panel">
        <div className="login-showcase">
          <div className="login-brand">
            <span><FileText size={22} /></span>
            <strong>ReceiptFlow</strong>
          </div>

          <div className="showcase-copy">
            <span className="showcase-label">Akıllı fiş yönetimi</span>
            <h1>Fişlerinizi birkaç saniyede düzenleyin.</h1>
            <p>Yükleyin, yapay zekâ ile analiz edin ve kayıtlarınızı tek yerde yönetin.</p>
          </div>

          <div className="showcase-preview" aria-hidden="true">
            <div className="preview-receipt">
              <div className="preview-line wide" />
              <div className="preview-line medium" />
              <div className="preview-line short" />
              <div className="preview-divider" />
              <div className="preview-total"><span>Toplam</span><strong>₺1.248,90</strong></div>
            </div>
            <div className="preview-badge"><Sparkles size={15} /> Analiz tamamlandı</div>
          </div>

          <div className="showcase-trust"><ShieldCheck size={16} /> Verileriniz güvenli oturumla korunur</div>
        </div>

        <div className="login-form-side">
          <div className="mobile-brand">
            <span><FileText size={20} /></span>
            <strong>ReceiptFlow</strong>
          </div>
          <div className="login-copy">
            <h2>Hoş geldiniz</h2>
            <p>ReceiptFlow hesabınıza devam etmek için giriş yapın.</p>
          </div>

          <form action={async () => {
            "use server";
            await signIn("gatehub", { redirectTo: "/" });
          }}>
            <button className="gatehub-login-button" type="submit" disabled={!configured}>
              <GoogleIcon />
              <span>Google ile devam et</span>
            </button>
          </form>

          {!configured && (
            <p className="login-config-note">GateHub istemci bilgileri henüz yapılandırılmadı.</p>
          )}
          <p className="login-legal">Giriş yaparak güvenli oturum kullanımını kabul etmiş olursunuz.</p>
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.53l3.35-2.61Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
    </svg>
  );
}
