"use client";
import { useId, useState } from "react";
import Image from "next/image";
import { identitySeed } from "../product/staking-history";
import { NexnsBrandMark } from "./brand-mark";
export function ProjectLogo({
  logo,
  identity = logo,
  platform = false,
}: {
  logo: string;
  identity?: string;
  platform?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const id = useId().replaceAll(":", "");
  const seed = identitySeed(identity);
  const colors = ["#5368dc", "#6f54c7", "#2386a0", "#365caa", "#5f6ca4"];
  const color = platform ? "#304fe3" : colors[seed % colors.length];
  if (
    failed !== logo &&
    (logo.startsWith("data:image/") || /^https?:\/\//.test(logo))
  )
    return (
      <Image
        src={logo}
        width={48}
        height={48}
        unoptimized
        onError={() => setFailed(logo)}
        alt="Logo"
        className="token-mark uploaded"
      />
    );
  if (platform)
    return (
      <NexnsBrandMark className="token-mark nexns-mark" identity={identity} />
    );
  return (
    <svg
      viewBox="0 0 48 48"
      className={`token-mark ${platform ? "nexns-mark" : ""}`}
      role="img"
      aria-label={platform ? "NEXNS" : "Token logo"}
      data-identity={identity}
    >
      <defs>
        <linearGradient id={id} x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={platform ? "#18accb" : "#a6b8df"} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      {platform ? (
        <path
          d="M13 34V14l22 20V14"
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : logo.length > 1 && logo.length <= 4 ? (
        <text
          x="24"
          y="29"
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="650"
        >
          {logo}
        </text>
      ) : (
        <g
          transform={`rotate(${(seed % 4) * 45} 24 24)`}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinejoin="round"
        >
          {seed % 3 === 0 ? (
            <>
              <path d="M24 10 37 24 24 38 11 24Z" />
              <path d="M17 24h14M24 17v14" />
            </>
          ) : seed % 3 === 1 ? (
            <>
              <path d="M12 28 24 11 36 28 24 36Z" />
              <path d="M12 28h24" />
            </>
          ) : (
            <>
              <path d="M13 15h15v15H13ZM20 22h15v15H20Z" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}
