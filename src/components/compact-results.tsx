"use client";
import type { ReactNode } from "react";
import { useLocale } from "../i18n/locale";
export function CompactResults({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
}) {
  const { t } = useLocale();
  return (
    <div className="compact-results">
      <table>
        <caption>{t(caption)}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c}>
                {t(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} data-label={t(columns[j])}>
                    {t(v ?? "N/A")}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr className="compact-empty">
              <td colSpan={columns.length}>{t("当前暂无结果记录。")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function SummaryStrip({
  items,
}: {
  items: { label: string; value: ReactNode; className?: string }[];
}) {
  const { t } = useLocale();
  return (
    <dl className="summary-strip">
      {items.map((i) => (
        <div key={i.label} className={i.className}>
          <dt>{t(i.label)}</dt>
          <dd>{t(i.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
