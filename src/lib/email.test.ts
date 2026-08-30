import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend(this: { emails: { send: typeof send } }) {
    this.emails = { send };
  }),
}));

async function loadEmail() {
  vi.resetModules();
  return import("@/lib/email");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  send.mockReset();
});

describe("sendEmail", () => {
  // The failure this guards: `vercel env pull` routinely puts the real
  // RESEND_API_KEY into .env.local for database access, and a plain `next dev`
  // must not turn that into a live sender against production.
  it("never calls the provider when not running on Vercel, even with a real key present", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("RESEND_API_KEY", "re_live_key");
    const { sendEmail } = await loadEmail();

    const result = await sendEmail("aylin@example.com", { subject: "Hi", html: "<p>Hi</p>" });

    expect(result).toEqual({ delivered: false, reason: "development-log" });
    expect(send).not.toHaveBeenCalled();
  });

  it("logs an error and sends nothing when deployed without a key", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendEmail } = await loadEmail();

    const result = await sendEmail("aylin@example.com", { subject: "Hi", html: "<p>Hi</p>" });

    expect(result).toEqual({ delivered: false, reason: "missing-api-key" });
    expect(send).not.toHaveBeenCalled();
  });

  it("calls the provider only when deployed with a key configured", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("RESEND_API_KEY", "re_live_key");
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    const { sendEmail } = await loadEmail();

    const result = await sendEmail("aylin@example.com", { subject: "Hi", html: "<p>Hi</p>" });

    expect(result).toEqual({ delivered: true });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
