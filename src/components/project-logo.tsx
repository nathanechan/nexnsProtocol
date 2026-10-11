"use client";
import { useLocale } from "../i18n/locale";
import Image from "next/image";
export function ProjectLogo({ logo }: { logo: string }) {
  const { t } = useLocale();

  return logo.startsWith("data:image/") ? (
    <Image
      src={logo}
      width={48}
      height={48}
      unoptimized
      alt={t("项目标志")}
      style={{ objectFit: "cover", borderRadius: 12 }}
    />
  ) : (
    <>{t(logo)}</>
  );
}
