"use client";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { useLocale } from "../i18n/locale";
import { decimal, UNIT } from "../domain/economics/amount";

export function AmountPresets({
  available,
  currency,
  disabled,
  onSelect,
}: {
  available: bigint;
  currency: boolean;
  disabled: boolean;
  onSelect: (value: string) => void;
}) {
  const { locale } = useLocale();
  const options = currency ? [25, 100, 250] : [25, 50, 75];
  return (
    <div
      className="amount-presets"
      role="group"
      aria-label={locale === "en" ? "Quick amount" : "快捷金额"}
    >
      {options.map((value) => {
        const amount = currency
          ? BigInt(value) * UNIT
          : (available * BigInt(value)) / 100n;
        return (
          <button
            type="button"
            key={value}
            disabled={disabled || amount === 0n || amount > available}
            onClick={() => onSelect(decimal(amount))}
          >
            {currency ? `${value} USDT` : `${value}%`}
          </button>
        );
      })}
    </div>
  );
}

export function ActionFeedback({
  message,
  pending,
  success,
}: {
  message: string;
  pending: boolean;
  success: boolean;
}) {
  const { t, locale } = useLocale();
  const prefixes = [
    ["参与成功 · 已参与", "Participation complete · Participated"],
    ["质押成功 · 已质押", "Stake complete · Staked"],
    ["解除质押成功 · 已解除质押", "Unstake complete · Unstaked"],
    ["领取成功 · 实际到账", "Claim complete · Received"],
  ];
  const pair = prefixes.find(
    ([zh, en]) => message.startsWith(zh) || message.startsWith(en),
  );
  const localizedMessage = pair
    ? message.replace(
        message.startsWith(pair[0]) ? pair[0] : pair[1],
        pair[locale === "en" ? 1 : 0],
      )
    : message;
  const Icon = pending ? LoaderCircle : success ? CheckCircle2 : CircleAlert;
  return (
    <div
      className={`trade-status action-feedback ${message ? (pending ? "operation-pending" : success ? "operation-success" : "operation-error") : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message && (
        <>
          <Icon
            size={18}
            aria-hidden
            className={pending ? "feedback-spinner" : undefined}
          />
          <span>{t(localizedMessage)}</span>
        </>
      )}
    </div>
  );
}
