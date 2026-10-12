"use client";
import { useLocale } from "../i18n/locale";
import { useId, useState } from "react";
import type { Project } from "../domain/models";
import { projectKey, shortAddress } from "../domain/identity";
import {
  balanceKey,
  simulationStore,
  useSimulation,
} from "../simulation/store";
import { displayAmount, displayNumber } from "../domain/economics/amount";
import {
  ledgerState,
  quoteBuy,
  quoteSell,
  type CurveQuote,
} from "../domain/economics/curve";
import { date, price, curvePercent } from "../product/format";
import { Button, DetailCard, Input, KeyValueList, Modal } from "./ui";
import { FinancialIdentity } from "./financial-identity";
import { ProductTabs } from "./product-tabs";
export function CurveHoldings({ project }: { project: Project }) {
  const { t } = useLocale();

  const key = projectKey(project.chainId, project.tokenContract);
  const balances = useSimulation((s) => s.exactBalances);
  const user = useSimulation((s) => s.currentUser);
  const activities = useSimulation((s) => s.activities);
  return (
    <DetailCard title={t("我的曲线资产")}>
      <KeyValueList
        items={[
          {
            label: `我的 ${project.symbol} 余额`,
            value: displayAmount(
              BigInt(
                balances[balanceKey(project.chainId, project.tokenContract)] ??
                  "0",
              ),
            ),
          },
          {
            label: "我的 USDT 余额",
            value: displayAmount(
              BigInt(balances[balanceKey(project.chainId, "USDT")] ?? "0"),
            ),
          },
        ]}
      />

      <ol className="activity-feed">
        {t(
          activities
            .filter(
              (a) =>
                a.projectKey === key &&
                a.wallet === user.wallet &&
                (a.type === "BUY" || a.type === "SELL"),
            )
            .slice(0, 3)
            .map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{t(a.displayValues.summary)}</strong>
                  <small>{t(date(a.timestamp))}</small>
                </div>
              </li>
            )),
        )}
      </ol>
    </DetailCard>
  );
}
export function TradePanel({ project }: { project: Project }) {
  const { t } = useLocale();

  const key = projectKey(project.chainId, project.tokenContract);
  const ledger = useSimulation((s) => s.curves[key]);
  const balances = useSimulation((s) => s.exactBalances);
  const [side, setSide] = useState("buy");
  const [input, setInput] = useState("");
  const [review, setReview] = useState<CurveQuote | null>(null);
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const id = useId();
  const available = BigInt(
    balances[
      balanceKey(
        project.chainId,
        side === "buy" ? "USDT" : project.tokenContract,
      )
    ] ?? "0",
  );
  let quote: CurveQuote | null = null;
  let error = "";
  try {
    if (input.trim()) {
      if (!ledger) throw new Error("报价暂不可用");
      if (project.lifecycle !== "CURVE_OPEN") throw new Error("曲线交易已关闭");
      quote = (side === "buy" ? quoteBuy : quoteSell)(
        ledgerState(ledger),
        input,
      );
      if (available < (side === "buy" ? quote.accepted : quote.tokenAmount))
        error = side === "buy" ? "USDT 余额不足" : "代币余额不足";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "报价暂不可用";
  }
  const values = (q: CurveQuote) => [
    {
      label: q.side === "buy" ? "预计获得" : "实际到账",
      value: `${displayAmount(q.receive)} ${q.side === "buy" ? project.symbol : "USDT"}`,
    },
    { label: "手续费", value: `${displayAmount(q.fee)} USDT` },
    ...(q.side === "buy"
      ? [
          { label: "实际支付", value: `${displayAmount(q.accepted)} USDT` },
          ...(q.unused > 0n
            ? [
                {
                  label: "输入金额",
                  value: `${displayAmount(q.entered)} USDT`,
                },
                {
                  label: "未使用金额",
                  value: `${displayAmount(q.unused)} USDT`,
                },
              ]
            : []),
        ]
      : [
          {
            label: "卖出数量",
            value: `${displayAmount(q.tokenAmount)} ${project.symbol}`,
          },
          {
            label: "手续费前金额",
            value: `${displayAmount(q.grossOutput)} USDT`,
          },
        ]),
    { label: "当前价格", value: price(project.curve.curvePrice) },
    { label: "预计新价格", value: price(displayNumber(q.newPrice)) },
    { label: "新曲线进度", value: curvePercent(displayNumber(q.progress)) },
  ];
  const execute = async () => {
    if (!review || processing) return;
    setProcessing(true);
    setMessage("正在处理交易…");
    try {
      await new Promise((r) => setTimeout(r, 300));
      const result = simulationStore
        .getState()
        .trade(key, review.side, input, review);
      setMessage(
        `交易成功 · ${review.side === "buy" ? "获得" : "到账"} ${displayAmount(result.receive)} ${review.side === "buy" ? project.symbol : "USDT"}`,
      );
      setInput("");
      setOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "交易失败，请重新确认");
      setOpen(false);
    } finally {
      setProcessing(false);
    }
  };
  return (
    <DetailCard title={t("曲线交易")}>
      <ProductTabs
        label={t("交易方向")}
        items={[
          { value: "buy", label: "买入" },
          { value: "sell", label: "卖出" },
        ]}
        value={side}
        onChange={(value) => {
          setSide(value);
          setInput("");
          setMessage("");
        }}
      >
        <div className="trade-preview">
          <label htmlFor={id}>
            {t(
              side === "buy"
                ? "支付金额 · USDT"
                : `卖出数量 · ${project.symbol}`,
            )}
            <Input
              id={id}
              inputMode="decimal"
              placeholder={t("0.00")}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setMessage("");
              }}
              aria-invalid={!!error}
              aria-describedby={`${id}-error`}
              disabled={processing}
            />
          </label>
          <div className="trade-available">
            {t("可用 ")}
            {t(displayAmount(available))}
            {t(" ")}
            {side === "buy" ? "USDT" : project.symbol}
          </div>
          <p
            id={`${id}-error`}
            className="field-error"
            role={error ? "alert" : undefined}
          >
            {t(error)}
          </p>
          {t(
            quote ? (
              <KeyValueList
                items={values(quote).filter((v) =>
                  [
                    "预计获得",
                    "实际到账",
                    "手续费",
                    "实际支付",
                    "未使用金额",
                  ].includes(v.label),
                )}
              />
            ) : (
              <p className="small-note">{t("输入金额，查看预计成交结果。")}</p>
            ),
          )}
          {t(
            quote?.unused ? (
              <div className="cap-notice">
                {t(
                  "本次仅接受完成发行所需的金额，未使用部分保留在你的余额中。",
                )}
              </div>
            ) : null,
          )}
          <Modal
            open={open}
            onOpenChange={(v) => {
              if (!processing) setOpen(v);
            }}
            title={t(side === "buy" ? "确认买入" : "确认卖出")}
            description={t("请核对项目、金额与预计到账。")}
            trigger={
              <Button
                disabled={!quote || !!error || processing}
                onClick={() => {
                  setReview(quote);
                  setMessage("");
                }}
              >
                {t(side === "buy" ? "确认买入" : "确认卖出")}
              </Button>
            }
          >
            <FinancialIdentity
              project={project}
              action={side === "buy" ? "买入" : "卖出"}
            />
            <KeyValueList
              items={
                review
                  ? [
                      {
                        label: "输入金额",
                        value: `${displayAmount(review.entered)} ${side === "buy" ? "USDT" : project.symbol}`,
                      },
                      ...values(review).filter((v) => v.label !== "输入金额"),
                    ]
                  : []
              }
            />
            <Button disabled={processing || !review} onClick={execute}>
              {t(processing ? "处理中…" : "确认交易")}
            </Button>
            <p role="status" aria-live="polite">
              {t(processing ? "正在处理交易…" : "")}
            </p>
          </Modal>
          <p
            className={`trade-status ${message.includes("成功") ? "operation-success" : ""}`}
            role="status"
            aria-live="polite"
          >
            {t(message)}
          </p>
        </div>
      </ProductTabs>
    </DetailCard>
  );
}
export function TradeWallet({ wallet }: { wallet: string }) {
  const { t } = useLocale();

  return <span>{t(shortAddress(wallet))}</span>;
}
