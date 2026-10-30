import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ROUTE_URL = "http://localhost/api/receipts/extract";

function upload(file?: File, ip = "1.1.1.1") {
  const body = new FormData();
  if (file) body.set("receipt", file);
  return new NextRequest(ROUTE_URL, { method: "POST", body, headers: { "x-forwarded-for": ip } });
}

const image = (size = 3) => new File([new Uint8Array(size)], "fis.png", { type: "image/png" });

function geminiResult(payload: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }));
}

// Hız sınırı modül içinde tutulduğu için her test taze modül yükler.
const loadRoute = () => import("@/app/api/receipts/extract/route");

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET", () => {
  it("anahtarın tanımlı olup olmadığını bildirir", async () => {
    const { GET } = await loadRoute();
    expect(await GET().json()).toEqual({ configured: true });
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await GET().json()).toEqual({ configured: false });
  });
});

describe("POST doğrulama", () => {
  it("anahtar yoksa 503 döner ve Gemini'ye gitmez", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await loadRoute();
    const response = await POST(upload(image()));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("MISSING_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dosyasız isteği reddeder", async () => {
    const { POST } = await loadRoute();
    expect((await POST(upload())).status).toBe(400);
  });

  it("görsel olmayan dosyayı reddeder", async () => {
    const { POST } = await loadRoute();
    const pdf = new File(["x"], "fatura.pdf", { type: "application/pdf" });
    expect((await POST(upload(pdf))).status).toBe(400);
  });

  it("10 MB üstü dosyayı reddeder", async () => {
    const { POST } = await loadRoute();
    expect((await POST(upload(image(10 * 1024 * 1024 + 1)))).status).toBe(400);
  });
});

describe("POST hız sınırı", () => {
  it("IP başına saatlik sınırı uygular, diğer IP'leri etkilemez", async () => {
    vi.stubEnv("RECEIPTFLOW_IP_HOURLY_LIMIT", "2");
    const { POST } = await loadRoute();
    expect((await POST(upload(undefined, "1.1.1.1"))).status).toBe(400);
    expect((await POST(upload(undefined, "1.1.1.1"))).status).toBe(400);
    expect((await POST(upload(undefined, "1.1.1.1"))).status).toBe(429);
    expect((await POST(upload(undefined, "2.2.2.2"))).status).toBe(400);
  });

  it("günlük toplam sınırı uygular", async () => {
    vi.stubEnv("RECEIPTFLOW_DAILY_LIMIT", "1");
    const { POST } = await loadRoute();
    expect((await POST(upload(undefined, "1.1.1.1"))).status).toBe(400);
    expect((await POST(upload(undefined, "2.2.2.2"))).status).toBe(429);
  });

  it("zincirli x-forwarded-for başlığında ilk IP'yi sayar", async () => {
    vi.stubEnv("RECEIPTFLOW_IP_HOURLY_LIMIT", "1");
    const { POST } = await loadRoute();
    await POST(upload(undefined, "1.1.1.1, 9.9.9.9"));
    expect((await POST(upload(undefined, "1.1.1.1, 8.8.8.8"))).status).toBe(429);
  });
});

describe("POST Gemini yanıtları", () => {
  it.each([
    [401, 401],
    [403, 502],
    [429, 502],
    [500, 502],
  ])("Gemini %i dönerse %i döner", async (upstream, expected) => {
    vi.stubGlobal("fetch", async () => new Response("hata", { status: upstream }));
    const { POST } = await loadRoute();
    expect((await POST(upload(image()))).status).toBe(expected);
  });

  it("boş yanıtta 502 döner", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ candidates: [] })));
    const { POST } = await loadRoute();
    expect((await POST(upload(image()))).status).toBe(502);
  });

  it("bozuk JSON'da 500 döner", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{bozuk" }] } }] })));
    const { POST } = await loadRoute();
    expect((await POST(upload(image()))).status).toBe(500);
  });

  it("başarılı yanıtta alanlara kimlik ve sağlayıcı ekler", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      geminiResult({ documentType: "Fiş", fields: [{ key: "total" }, { key: "total" }], lineItems: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await loadRoute();
    const body = await (await POST(upload(image()))).json();
    expect(body.fields.map((f: { id: string }) => f.id)).toEqual(["total-0", "total-1"]);
    expect(body.provider).toBe("Google Gemini");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    const sent = JSON.parse(init.body as string);
    expect(sent.contents[0].parts[0].inline_data.mime_type).toBe("image/png");
  });
});
