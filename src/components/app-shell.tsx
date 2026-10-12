"use client";
import { useLocale } from "../i18n/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Layers, Activity, Wallet } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { Button, Container, EmptyState, Modal } from "./ui";
import { useSimulation } from "../simulation/store";
const navigation = [
  { href: "/launch", label: "发行", en: "Launch", icon: Layers },
  { href: "/live", label: "运行", en: "Live", icon: Activity },
  { href: "/portfolio", label: "资产", en: "Portfolio", icon: Wallet },
];
export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useLocale();

  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    document.querySelector<HTMLAnchorElement>("#product-menu a")?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuTrigger.current?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [menuOpen]);
  const navLabel = (n: (typeof navigation)[number]) =>
    locale === "zh-CN" ? n.label : n.en;
  const projects = useSimulation((s) => s.projects);

  const wallet = useSimulation((s) => s.currentUser.wallet);
  const ownProjects = Object.values(projects).filter(
    (p) => p.creatorWallet.toLowerCase() === wallet.toLowerCase(),
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("跳转到主要内容")}
      </a>
      <header className="app-header">
        <div className="topbar">
          <div className="logo-menu">
            <button
              ref={menuTrigger}
              className="brand"
              type="button"
              aria-label={locale === "zh-CN" ? "产品菜单" : "Product menu"}
              aria-expanded={menuOpen}
              aria-controls="product-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="brand-mark">N</span>NEXNS
            </button>
            {menuOpen && (
              <>
                <button
                  className="menu-dismiss"
                  aria-label={locale === "zh-CN" ? "关闭菜单" : "Close menu"}
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  id="product-menu"
                  className="product-menu"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setMenuOpen(false);
                  }}
                >
                  <Link href="/nexns" onClick={() => setMenuOpen(false)}>
                    NEXNS
                  </Link>
                  <Link href="/protocol" onClick={() => setMenuOpen(false)}>
                    {t("协议")}
                  </Link>
                  <Link href="/create" onClick={() => setMenuOpen(false)}>
                    {t("创建项目")}
                  </Link>
                  <Link
                    href={
                      ownProjects[0]
                        ? `/studio/${ownProjects[0].projectId}`
                        : "/portfolio?tab=projects"
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    {locale === "zh-CN" ? "创建者工作室" : "Creator Studio"}
                  </Link>
                  <label>
                    {locale === "zh-CN" ? "语言" : "Language"}
                    <select
                      aria-label={
                        locale === "zh-CN" ? "菜单语言" : "Menu language"
                      }
                      value={locale}
                      onChange={(e) =>
                        setLocale(e.target.value as "zh-CN" | "en")
                      }
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>
              </>
            )}
          </div>
          <nav className="desktop-primary" aria-label={t("主导航")}>
            {navigation.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
              >
                {navLabel(n)}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <GlobalSearch />
            <select
              className="language-switch desktop-language"
              aria-label={locale === "zh-CN" ? "语言" : "Language"}
              value={locale}
              onChange={(e) => setLocale(e.target.value as "zh-CN" | "en")}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
            <Link href="/create" className="button secondary desktop-create">
              {locale === "zh-CN" ? "+ 创建项目" : "+ Create Project"}
            </Link>
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
      <nav
        className="mobile-primary"
        aria-label={locale === "zh-CN" ? "底部导航" : "Bottom navigation"}
      >
        {navigation.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={pathname === n.href ? "page" : undefined}
          >
            <n.icon size={19} />
            <span>{navLabel(n)}</span>
          </Link>
        ))}
      </nav>
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
