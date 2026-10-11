"use client";
import { useLocale } from "../i18n/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Bell, ArrowUpRight } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { Button, Container, EmptyState, Modal } from "./ui";
import { useSimulation } from "../simulation/store";
import { OutcomeEvents } from "./result-views";
const navigation = [
  { href: "/network", label: "网络", en: "Network" },
  { href: "/explore", label: "探索", en: "Explore" },
  { href: "/my-nexus", label: "资产", en: "Portfolio" },
  { href: "/p-ecosystem", label: "NEXNS", en: "NEXNS" },
  { href: "/protocol", label: "协议", en: "Protocol" },
];
export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useLocale();

  const pathname = usePathname();
  const activities = useSimulation((s) => s.activities);
  const wallet = useSimulation((s) => s.currentUser.wallet);
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("跳转到主要内容")}
      </a>
      <header className="app-header">
        <div className="topbar">
          <Link className="brand" href="/network">
            <span className="brand-mark">N</span>
            {t("NEXNS")}
          </Link>
          <nav aria-label={t("主导航")}>
            {t(
              navigation.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={pathname === n.href ? "page" : undefined}
                >
                  <span>{t(n.label)}</span>
                </Link>
              )),
            )}
          </nav>
          <div className="header-actions">
            <select
              className="language-switch"
              aria-label={locale === "zh-CN" ? "语言" : "Language"}
              value={locale}
              onChange={(e) => setLocale(e.target.value as "zh-CN" | "en")}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
            <GlobalSearch />
            <Modal
              title={t("通知")}
              description={t("最近操作结果。")}
              trigger={
                <Button variant="ghost" aria-label={t("通知")}>
                  <Bell size={18} />
                </Button>
              }
            >
              <OutcomeEvents
                events={activities
                  .filter(
                    (a) =>
                      a.wallet === wallet &&
                      [
                        "REWARD_SETTLED",
                        "CLAIM",
                        "POSITION_COMPLETED",
                      ].includes(a.type),
                  )
                  .slice(0, 5)}
              />
            </Modal>
            <Modal
              title={t("钱包")}
              description={t("查看当前钱包与资产。")}
              trigger={<Button variant="secondary">{t("钱包")}</Button>}
            >
              <EmptyState title={t("当前钱包")} description={t(wallet)} />
            </Modal>
          </div>
        </div>
      </header>
      <main id="main-content">
        <Container>{t(children)}</Container>
      </main>
      <footer>
        <Container>
          <span>{t("NEXNS · 链上经济操作层")}</span>
          <Link href="/create">
            {t("创建项目")}
            <ArrowUpRight size={14} />
          </Link>
        </Container>
      </footer>
    </>
  );
}
