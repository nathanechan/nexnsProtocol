"use client";
import { useLocale } from "../i18n/locale";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button, Modal } from "./ui";
import { SearchPanel } from "./search-panel";
export function GlobalSearch() {
  const { t } = useLocale();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={t("搜索项目")}
      description={t("搜索覆盖全部项目，包括发现池之外的项目。")}
      trigger={
        <Button variant="ghost" aria-label={t("全局搜索")}>
          <Search size={18} />
          <span className="desktop-only">{t("搜索项目")}</span>
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
