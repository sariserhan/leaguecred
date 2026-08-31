import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export type BrandLogoProps = SVGProps<SVGSVGElement> & {
  size?: number;
  className?: string;
  accentColor?: string;
  primaryColor?: string;
};

/**
 * LeagueCred Tactical Hex Radar Brand Mark
 *
 * Geometric hexagon framing a football pitch kickoff center circle,
 * goal areas, and tactical coordinate radar vectors in signature
 * midnight navy (#050d1c) and grass-lime (#b2df00).
 */
export function BrandMark({
  size = 32,
  className,
  accentColor = "#b2df00",
  primaryColor = "#050d1c",
  ...props
}: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Outer Hexagon Shield */}
      <polygon
        points="32,4 58,19 58,45 32,60 6,45 6,19"
        fill={primaryColor}
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Inner Pitch Border */}
      <polygon
        points="32,8 54,20.5 54,43.5 32,56 10,43.5 10,20.5"
        fill="none"
        stroke={accentColor}
        strokeWidth="1.2"
        strokeOpacity="0.4"
        strokeLinejoin="round"
      />

      {/* Center Halfway Line */}
      <line
        x1="10"
        y1="32"
        x2="54"
        y2="32"
        stroke={accentColor}
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />

      {/* Center Circle & Spot */}
      <circle
        cx="32"
        cy="32"
        r="9"
        fill="none"
        stroke={accentColor}
        strokeWidth="1.8"
      />
      <circle cx="32" cy="32" r="2.5" fill={accentColor} />

      {/* Top Penalty Area */}
      <path
        d="M 22 13.5 L 42 13.5 L 42 22 L 22 22 Z"
        fill="none"
        stroke={accentColor}
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
      <path
        d="M 27 22 A 5 5 0 0 0 37 22"
        fill="none"
        stroke={accentColor}
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
      <circle cx="32" cy="18" r="1" fill={accentColor} />

      {/* Bottom Penalty Area */}
      <path
        d="M 22 50.5 L 42 50.5 L 42 42 L 22 42 Z"
        fill="none"
        stroke={accentColor}
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
      <path
        d="M 27 42 A 5 5 0 0 1 37 42"
        fill="none"
        stroke={accentColor}
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
      <circle cx="32" cy="46" r="1" fill={accentColor} />

      {/* Tactical Coordinate Nodes / Vectors */}
      <line
        x1="18"
        y1="25"
        x2="25"
        y2="18"
        stroke={accentColor}
        strokeWidth="1"
        strokeDasharray="1.5 1.5"
        strokeOpacity="0.6"
      />
      <circle cx="18" cy="25" r="1.2" fill={accentColor} />

      <line
        x1="46"
        y1="39"
        x2="39"
        y2="46"
        stroke={accentColor}
        strokeWidth="1"
        strokeDasharray="1.5 1.5"
        strokeOpacity="0.6"
      />
      <circle cx="46" cy="39" r="1.2" fill={accentColor} />
    </svg>
  );
}

/**
 * Full Brand Logo: BrandMark + Editorial Wordmark
 */
export function BrandLogo({
  className,
  markSize = 32,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={markSize} />
      <span className="font-heading text-3xl leading-none font-extrabold tracking-[-0.04em] uppercase sm:text-4xl">
        League<span className="text-primary">Cred</span>
      </span>
    </div>
  );
}
