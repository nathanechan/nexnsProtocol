"use client";
import { useLocale } from "../i18n/locale";
import {
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { Lifecycle, PriceStatus } from "../domain/models";
import { shortAddress } from "../domain/identity";
export const lifecycleLabels: Record<Lifecycle, string> = {
  CURVE_OPEN: "曲线发行",
  MIGRATION_READY: "待迁移",
  MIGRATING: "迁移中",
  OPERATING: "运行中",
};
export const priceLabels: Record<PriceStatus, string> = {
  VALID: "价格有效",
  PROTECTED: "价格保护",
  PRICE_DISCOVERY: "价格建立中",
  PRICE_INVALID: "价格无效",
};
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return <button className={`button ${variant} ${className}`} {...props} />;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />;
}
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} type="number" inputMode="decimal" />;
}
export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} type="search" />;
}
export function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLocale();

  return (
    <select
      aria-label={t(label)}
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {t(
        options.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.label)}
          </option>
        )),
      )}
    </select>
  );
}
export function Container({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return <div className="container">{t(children)}</div>;
}
export function Stack({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return <div className="stack">{t(children)}</div>;
}
export function InlineGroup({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return <div className="inline">{t(children)}</div>;
}
export function ResponsiveGrid({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return <div className="grid">{t(children)}</div>;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{t(eyebrow)}</div>
        <h1>{t(title)}</h1>
        <p>{t(description)}</p>
      </div>
      {t(action)}
    </header>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <section className="section">
      <h2>{t(title)}</h2>
      {t(children)}
    </section>
  );
}
export function DetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <article className="card">
      <h3>{t(title)}</h3>
      {t(children)}
    </article>
  );
}
export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number | null;
  detail?: string;
}) {
  const { t } = useLocale();

  return (
    <article className="card metric">
      <span>{t(label)}</span>
      <strong>{t(value ?? "N/A")}</strong>
      {t(detail && <small>{t(detail)}</small>)}
    </article>
  );
}
export function StatusCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { t } = useLocale();

  return (
    <DetailCard title={t(title)}>
      <p>{t(description)}</p>
    </DetailCard>
  );
}
export function KeyValueList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  const { t } = useLocale();

  return (
    <dl className="key-values">
      {t(
        items.map((i) => (
          <div
            key={i.label}
            className={
              i.label === "实际到账" || i.label === "You receive"
                ? "receive-result"
                : undefined
            }
          >
            <dt>{t(i.label)}</dt>
            <dd>{t(i.value ?? "N/A")}</dd>
          </div>
        )),
      )}
    </dl>
  );
}
export function DataTable({
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
    <div
      className="table-scroll"
      role="region"
      aria-label={t(caption)}
      tabIndex={0}
    >
      <table>
        <caption>{t(caption)}</caption>
        <thead>
          <tr>
            {t(
              columns.map((c) => (
                <th key={c} scope="col">
                  {t(c)}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {t(
            rows.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState description={t("当前暂无结果记录。")} />
                </td>
              </tr>
            ),
          )}
          {t(
            rows.map((row, i) => (
              <tr key={i}>
                {t(row.map((v, j) => <td key={j}>{t(v ?? "N/A")}</td>))}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
export function LifecycleBadge({ state }: { state: Lifecycle }) {
  const { t } = useLocale();

  return (
    <span className={`badge lifecycle ${state.toLowerCase()}`}>
      {t(lifecycleLabels[state])}
    </span>
  );
}
export function PriceStatusBadge({ status }: { status: PriceStatus }) {
  const { t } = useLocale();

  return (
    <span className={`badge neutral price-${status.toLowerCase()}`}>
      {t(priceLabels[status])}
    </span>
  );
}
export function DataFreshness({ timestamp }: { timestamp: string | null }) {
  const { t } = useLocale();

  return (
    <small>
      {t("最近更新：")}
      {t(
        timestamp
          ? new Date(timestamp).toISOString().replace("T", " ").slice(0, 16) +
              " UTC"
          : "N/A",
      )}
    </small>
  );
}
export function SystemStatus({
  status,
}: {
  status: "healthy" | "unavailable";
}) {
  const { t } = useLocale();

  return (
    <span className="badge neutral">
      {t(status === "healthy" ? "系统正常" : "数据暂不可用")}
    </span>
  );
}
export function Skeleton() {
  const { t } = useLocale();

  return (
    <div className="skeleton" role="status" aria-label={t("正在加载")}>
      <span className="sr-only">{t("正在加载")}</span>
    </div>
  );
}
export function EmptyState({
  title = "暂无内容",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>
        ◇
      </div>
      <h3>{t(title)}</h3>
      <p>{t(description)}</p>
      {t(action)}
    </div>
  );
}
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLocale();

  return (
    <div role="alert" className="empty">
      <h3>{t("数据加载失败")}</h3>
      <p>{t("数据源暂不可用，请稍后重试。")}</p>
      {t(
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {t("重试")}
          </Button>
        ),
      )}
    </div>
  );
}
export function InlineAlert({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return (
    <p className="alert" role="status">
      {t(children)}
    </p>
  );
}
export function Toast({ message }: { message: string }) {
  const { t } = useLocale();

  return (
    <div
      role="status"
      aria-live="polite"
      className={message ? "toast" : "sr-only"}
    >
      {t(message)}
    </div>
  );
}
export function ContractAddress({ address }: { address: string }) {
  const { t } = useLocale();

  const [message, setMessage] = useState("");
  return (
    <span className="address-wrap">
      <button
        className="address"
        title={t(address)}
        aria-label={t(`复制合约地址 ${address}`)}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setMessage("地址已复制");
          } catch {
            setMessage("复制失败，请手动复制完整地址");
          }
        }}
      >
        <span>{t(shortAddress(address))}</span>
        <span aria-hidden>⧉</span>
      </button>
      <Toast message={t(message)} />
    </span>
  );
}
export function WalletAddress({ address }: { address: string }) {
  const { t } = useLocale();

  return (
    <span className="wallet" title={t(address)}>
      {t(shortAddress(address))}
    </span>
  );
}
export function Modal({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useLocale();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>{t(trigger)}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog">
          <DialogPrimitive.Title>{t(title)}</DialogPrimitive.Title>
          <DialogPrimitive.Description>
            {t(description)}
          </DialogPrimitive.Description>
          {t(children)}
          <DialogPrimitive.Close asChild>
            <Button variant="secondary">{t("关闭")}</Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export const Dialog = Modal;
export function Tabs({
  items,
}: {
  items: { label: string; content: ReactNode }[];
}) {
  const { t } = useLocale();

  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="tabs" role="group" aria-label={t("内容切换")}>
        {t(
          items.map((item, i) => (
            <Button
              key={item.label}
              variant={active === i ? "primary" : "ghost"}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              {t(item.label)}
            </Button>
          )),
        )}
      </div>
      <div className="tab-content">{t(items[active]?.content)}</div>
    </div>
  );
}
export const SegmentedControl = Tabs;
