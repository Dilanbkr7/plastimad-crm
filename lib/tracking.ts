type PixelWindow = Window & {
  fbq?: (command: string, event: string, data?: Record<string, unknown>, options?: Record<string, unknown>) => void;
};

export function trackLead(id: string, source: string) {
  const pixel = (window as PixelWindow).fbq;
  if (!pixel) return;
  try {
    if (sessionStorage.getItem(`tracked:${id}`)) return;
    pixel("track", "Lead", { content_name: source }, { eventID: id });
    sessionStorage.setItem(`tracked:${id}`, "1");
  } catch {
    // Tracking must never prevent a customer from finishing their request.
  }
}

export function trackWhatsAppClick() {
  try {
    (window as PixelWindow).fbq?.("track", "Contact", { content_name: "WhatsApp" });
  } catch { /* The link still works if tracking is blocked. */ }
}
