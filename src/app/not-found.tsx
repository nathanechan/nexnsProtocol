"use client";
import { useLocale } from "../i18n/locale";
import Link from "next/link";
import { EmptyState } from "../components/ui";
export default function NotFound() {
  const { t } = useLocale();
  return (
    <EmptyState
      title="未找到页面或项目"
      description="请检查页面地址、链与合约地址。"
      action={
        <Link className="button secondary" href="/explore">
          {t("返回探索")}
        </Link>
      }
    />
  );
}
