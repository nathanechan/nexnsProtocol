"use client";
import { useLocale } from "../i18n/locale";
import { useId, useRef, type ReactNode } from "react";
export function ProductTabs({
  label,
  items,
  value,
  onChange,
  children,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const { t } = useLocale();

  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="product-tabs">
      <div role="tablist" aria-label={t(label)} className="product-tablist">
        {t(
          items.map((item, i) => (
            <button
              type="button"
              key={item.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`${id}-${item.value}`}
              aria-selected={value === item.value}
              aria-controls={`${id}-panel`}
              tabIndex={value === item.value ? 0 : -1}
              onClick={(e) => {
                onChange(item.value);
                if (typeof e.currentTarget.scrollIntoView === "function")
                  e.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                  });
              }}
              onKeyDown={(e) => {
                const target =
                  e.key === "ArrowRight"
                    ? (i + 1) % items.length
                    : e.key === "ArrowLeft"
                      ? (i - 1 + items.length) % items.length
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? items.length - 1
                          : null;
                if (target !== null) {
                  e.preventDefault();
                  refs.current[target]?.focus();
                  onChange(items[target].value);
                }
              }}
            >
              {t(item.label)}
            </button>
          )),
        )}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${value}`}
        tabIndex={0}
      >
        {t(children)}
      </div>
    </div>
  );
}
