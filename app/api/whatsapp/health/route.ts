import { getWhatsAppPublicConfigurationStatus } from "@/lib/whatsapp/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = getWhatsAppPublicConfigurationStatus();
  const origin = new URL(request.url).origin;
  const requiredConfigured =
    status.accessToken &&
    status.appSecret &&
    status.businessAccountId &&
    status.phoneNumberId &&
    status.verifyToken;

  return Response.json(
    {
      ok: requiredConfigured,
      service: "Plastimad WhatsApp Cloud API",
      webhook: `${origin}/api/whatsapp/webhook`,
      graphApiVersion: status.graphApiVersion,
      autoReplyEnabled: status.autoReplyEnabled,
      configured: {
        accessToken: status.accessToken,
        appSecret: status.appSecret,
        businessAccountId: status.businessAccountId,
        phoneNumberId: status.phoneNumberId,
        verifyToken: status.verifyToken,
      },
    },
    {
      status: requiredConfigured ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
