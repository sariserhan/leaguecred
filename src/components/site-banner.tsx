import { InfoIcon, MegaphoneIcon, TriangleAlertIcon } from "lucide-react";

import type { BannerTone } from "@/db/schema";
import { getSiteSettings } from "@/services/site-settings";

const toneStyles: Record<BannerTone, { className: string; Icon: typeof InfoIcon }> = {
  info: { className: "bg-secondary text-foreground", Icon: InfoIcon },
  warning: { className: "bg-primary text-primary-foreground", Icon: MegaphoneIcon },
  critical: { className: "bg-destructive text-white", Icon: TriangleAlertIcon },
};

export async function SiteBanner() {
  const settings = await getSiteSettings();
  if (!settings.bannerEnabled || !settings.bannerMessage) return null;

  const { className, Icon } = toneStyles[settings.bannerTone];

  return (
    <div className={className + " border-b"}>
      <div className="page-shell flex items-center gap-3 py-3">
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <p className="text-sm leading-6 font-semibold">{settings.bannerMessage}</p>
      </div>
    </div>
  );
}
