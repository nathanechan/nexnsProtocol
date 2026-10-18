"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle({ english }: { english: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const apply = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("nexns-theme");
      } catch {}
      const next =
        saved === "dark" || (saved !== "light" && (media?.matches ?? false));
      document.documentElement.dataset.theme = next ? "dark" : "light";
      setDark(next);
    };
    apply();
    media?.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => {
      media?.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);
  return (
    <button
      className="theme-toggle"
      aria-label={english ? "Toggle theme" : "切换明暗主题"}
      aria-pressed={dark}
      onClick={() => {
        const next = !dark;
        document.documentElement.dataset.theme = next ? "dark" : "light";
        setDark(next);
        try {
          localStorage.setItem("nexns-theme", next ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
