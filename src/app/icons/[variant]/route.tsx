import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/brand-logo";
import { PWA_ICON_VARIANTS, parsePwaIconVariant } from "@/lib/pwa";

export function generateStaticParams() {
  return PWA_ICON_VARIANTS.map((variant) => ({ variant }));
}

export async function GET(_request: Request, context: RouteContext<"/icons/[variant]">) {
  const { variant } = await context.params;
  const icon = parsePwaIconVariant(variant);
  if (!icon) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Full bleed on purpose. A maskable icon with a transparent corner
          // shows the launcher's own background through the crop, which reads
          // as a rendering fault rather than a design.
          background: "#050d1c",
        }}
      >
        <BrandMark size={Math.round(icon.size * icon.scale)} />
      </div>
    ),
    { width: icon.size, height: icon.size },
  );
}
