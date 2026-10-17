import type { SVGProps } from "react";

/** Final supplied artwork, framed without its transparent outer padding. */
export function NexnsBrandMark({
  identity,
  ...props
}: SVGProps<SVGSVGElement> & { identity?: string }) {
  return (
    <svg
      viewBox="230 145 880 980"
      role="img"
      aria-label="NEXNS"
      data-identity={identity}
      {...props}
    >
      <image href="/brand/nexns-logo.png" width="1306" height="1205" />
    </svg>
  );
}
