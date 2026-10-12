"use client";
import { useLocale } from "../i18n/locale";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Button, Modal } from "./ui";
import { SearchPanel } from "./search-panel";
export function GlobalSearch() {
  const { t } = useLocale();

  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const legacyQuery = new URLSearchParams(window.location.search).get("q");
    if (legacyQuery) {
      setQuery(legacyQuery);
      setOpen(true);
    }
  }, [pathname]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const show = () => setOpen(true);
    window.addEventListener("nexns-open-search", show);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      window.removeEventListener("nexns-open-search", show);
    };
  }, []);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={t("搜索")}
      description={t("合约地址、项目 ID、符号、名称或创建者钱包")}
      trigger={
        <Button variant="ghost" aria-label={t("搜索")}>
          <Search size={18} />
          <span className="desktop-only">{t("搜索")}</span>
        </Button>
      }
    >
      <SearchPanel
        query={query}
        onQueryChange={setQuery}
        onNavigate={() => setOpen(false)}
      />
    </Modal>
  );
}
