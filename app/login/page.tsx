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
              <ShieldCheck size={20} />
              <span>GateHub ile devam et</span>
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
