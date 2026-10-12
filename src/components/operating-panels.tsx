"use client";
import { useLocale } from "../i18n/locale";
import { useId, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Project } from "../domain/models";
import { projectKey, shortAddress } from "../domain/identity";
import {
  balanceKey,
  simulationStore,
  useSimulation,
} from "../simulation/store";
import {
  makeBook,
  bindSponsor,
  referralCode,
} from "../simulation/operating-actions";
import {
  activePrincipal,
  contributions,
  coverage,
  displayProgress,
  nextTier,
  tier,
  validPrices,
} from "../domain/economics/operating";
import { emptyMember } from "../domain/economics/settlement";
import {
  operatingQuote,
  type OperatingAction,
} from "../domain/economics/operating-quote";
import {
  displayAmount,
  displayNumber,
  decimal,
  UNIT,
} from "../domain/economics/amount";
import { date, percent, money, number } from "../product/format";
import {
  Button,
  ContractAddress,
  DetailCard,
  EmptyState,
  Input,
  KeyValueList,
  MetricCard,
  Modal,
  PriceStatusBadge,
  ResponsiveGrid,
  WalletAddress,
} from "./ui";
import { FinancialIdentity } from "./financial-identity";
import { ProductTabs } from "./product-tabs";
export function useOperating(project: Project) {
  const key = projectKey(project.chainId, project.tokenContract);
  const stored = useSimulation((s) => s.operatingBooks[key]);
  const book = useMemo(() => stored ?? makeBook(project), [stored, project]);
  const user = useSimulation((s) => s.currentUser);
  const balances = useSimulation((s) => s.exactBalances);
  const member = book.members[user.wallet] ?? emptyMember(user.wallet);
  const prices = validPrices({ ...book.prices, status: project.priceStatus });
  const principal = activePrincipal(member);
  const c = coverage(principal, BigInt(member.staked), prices?.stake ?? null);
  const level = tier(c);
  const graph = contributions(book.members, prices?.stake ?? null);
  return {
    key,
    book,
    member,
    prices,
    principal,
    coverage: c,
    level,
    contribution: graph[user.wallet],
    balances,
    user,
    tokenBalance: BigInt(
      balances[balanceKey(project.chainId, project.tokenContract)] ?? "0",
    ),
    usdtBalance: BigInt(balances[balanceKey(project.chainId, "USDT")] ?? "0"),
  };
}
const amount = (value: string | bigint, asset = "") =>
  `${displayAmount(typeof value === "string" ? BigInt(value) : value)}${asset ? " " + asset : ""}`;
const coverageText = (value: bigint | null) =>
  value === null ? "N/A" : percent(displayNumber(value));
const tierText = (index: number | null) =>
  index === null
    ? "N/A"
    : ["未达基础档", "基础档", "进阶档", "高覆盖档", "完整覆盖档"][index];
export function PositionLots({ project }: { project: Project }) {
  const { t } = useLocale();

  const { member } = useOperating(project);
  return (
    <DetailCard title={t("独立头寸")}>
      <details className="action-rules">
        <summary>{t("了解规则")}</summary>
        <p>
          {t("每次参与建立独立批次。容量为手续费前参考价值，不代表保证收益。")}
        </p>
      </details>
      {t(
        member.lots.length ? (
          <div className="lot-list">
            {t(
              member.lots.map((l) => (
                <details key={l.id}>
                  <summary>
                    <span>
                      {t("头寸")} {l.id.replace(/^DEMO-LOT-/, "")}
                    </span>
                    <span>
                      {t(amount(l.principal, "USDT"))} ·{t(" ")}
                      {t(l.status === "ACTIVE" ? "活跃" : "已完成")}
                    </span>
                  </summary>
                  <KeyValueList
                    items={[
                      {
                        label: "项目",
                        value: `${project.name} · ${project.symbol}`,
                      },
                      { label: "参与资金", value: amount(l.principal, "USDT") },
                      {
                        label: "生命周期容量",
                        value: amount(l.capacity, "USDT"),
                      },
                      { label: "已使用容量", value: amount(l.used, "USDT") },
                      {
                        label: "剩余容量",
                        value: amount(
                          BigInt(l.capacity) - BigInt(l.used),
                          "USDT",
                        ),
                      },
                      {
                        label: "累计已结算毛奖励",
                        value: amount(l.settledGross, project.symbol),
                      },
                      { label: "创建时间", value: date(l.createdAt) },
                      { label: "完成时间", value: date(l.completedAt) },
                    ]}
                  />
                </details>
              )),
            )}
          </div>
        ) : (
          <EmptyState title={t("暂无头寸")} description="" />
        ),
      )}
    </DetailCard>
  );
}
export function OperatingActionForm({
  project,
  kind,
}: {
  project: Project;
  kind: OperatingAction;
}) {
  const { t } = useLocale();

  const state = useOperating(project);
  const params = useSearchParams();
  const referral =
    kind === "participate" ? (params.get("ref") ?? undefined) : undefined;
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [review, setReview] = useState<{
    input: string;
    revision: number;
  } | null>(null);
  const id = useId();
  const available =
    kind === "participate"
      ? state.usdtBalance
      : kind === "stake"
        ? state.tokenBalance
        : kind === "unstake"
          ? BigInt(state.member.staked)
          : BigInt(state.member.claimable);
  const asset = kind === "participate" ? "USDT" : project.symbol;
  const title = {
    participate: "参与项目",
    stake: "质押代币",
    unstake: "解除质押",
    claim: "领取奖励",
  }[kind];
  const cta = {
    participate: "确认参与",
    stake: "确认质押",
    unstake: "确认解除质押",
    claim: "确认领取",
  }[kind];
  let error = "";
  let quote: ReturnType<typeof operatingQuote> | null = null;
  let sponsor: string | null = null;
  try {
    if (kind === "participate")
      sponsor = bindSponsor(
        { ...state.book, projectIdentity: state.key },
        state.user.wallet,
        referral,
      );
    if (input.trim())
      quote = operatingQuote(
        kind,
        input,
        {
          ...state.book,
          prices: { ...state.book.prices, status: project.priceStatus },
        },
        state.member,
        available,
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "报价暂不可用";
  }
  const items = quote
    ? [
        {
          label:
            kind === "claim"
              ? "本次领取"
              : kind === "participate"
                ? "参与金额"
                : "本次数量",
          value: amount(quote.amount, asset),
        },
        ...(kind === "participate"
          ? [
              {
                label: "生命周期容量",
                value: amount(quote.capacity, "USDT"),
              },
              {
                label: "推荐关系",
                value:
                  state.user.wallet === state.book.root
                    ? "创建者根身份"
                    : sponsor
                      ? shortAddress(sponsor)
                      : "未绑定",
              },
            ]
          : kind === "claim"
            ? [
                { label: "实际到账", value: amount(quote.receive, asset) },
                {
                  label: "预计价值",
                  value:
                    quote.estimatedValue === null
                      ? "N/A"
                      : amount(quote.estimatedValue, "USDT"),
                },
                {
                  label: "领取后可领取",
                  value: amount(quote.balanceAfter, asset),
                },
              ]
            : [
                { label: "当前覆盖率", value: coverageText(quote.current) },
                { label: "预计新覆盖率", value: coverageText(quote.next) },
                { label: "当前档位", value: tierText(quote.currentTier.index) },
                { label: "预计新档位", value: tierText(quote.nextTier.index) },
                {
                  label: kind === "unstake" ? "代币返还" : "质押后钱包余额",
                  value:
                    kind === "unstake"
                      ? amount(quote.amount, asset)
                      : amount(quote.balanceAfter, asset),
                },
              ]),
      ]
    : [];
  const execute = async () => {
    if (!review || processing) return;
    setProcessing(true);
    setStatus("处理中…");
    try {
      await new Promise((r) => setTimeout(r, 300));
      const s = simulationStore.getState();
      const book = s.operatingBooks[state.key];
      if ((book?.revision ?? 0) !== review.revision)
        throw new Error("状态已变化，请重新确认");
      if (kind === "participate")
        s.participate(state.key, review.input, referral);
      else if (kind === "claim") s.claimReward(state.key, review.input);
      else s.stakeTokens(state.key, review.input, kind === "unstake");
      setStatus(`${title}成功，资产与权益已更新`);
      setInput("");
      setOpen(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "处理失败，请重试");
      setOpen(false);
    } finally {
      setProcessing(false);
    }
  };
  return (
    <DetailCard title={t(title)}>
      <div className="operating-form">
        <label htmlFor={id}>
          {t(
            kind === "participate"
              ? "参与金额"
              : kind === "claim"
                ? "领取数量"
                : kind === "unstake"
                  ? "解除质押数量"
                  : "质押数量",
          )}
          {t(" ")}· {t(asset)}
          <Input
            id={id}
            inputMode="decimal"
            placeholder={t("0.00")}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setStatus("");
            }}
            disabled={processing}
            aria-invalid={!!error}
            aria-describedby={`${id}-error`}
          />
        </label>
        <div className="trade-available">
          {t(
            kind === "claim"
              ? "可领取"
              : kind === "unstake"
                ? "已质押"
                : "可用",
          )}
          {t(" ")}
          {t(amount(available, asset))}
          <Button
            variant="ghost"
            onClick={() => setInput(decimal(available))}
            disabled={available === 0n || processing}
          >
            {t("使用全部")}
          </Button>
        </div>
        <p
          className="field-error"
          id={`${id}-error`}
          role={error ? "alert" : undefined}
        >
          {t(error)}
        </p>
        {t(
          quote && (
            <KeyValueList
              items={items.filter(
                (item) =>
                  ![
                    "参与金额",
                    "本次数量",
                    "推荐关系",
                    "当前覆盖率",
                    "当前档位",
                  ].includes(item.label),
              )}
            />
          ),
        )}
        <p
          className={
            kind === "participate"
              ? "principal-notice"
              : "small-note action-extra-copy"
          }
        >
          {t(
            kind === "participate"
              ? "参与资金不支持本金赎回"
              : kind === "unstake"
                ? "解除质押后覆盖率与当前档位可能降低；历史已结算权益保留。"
                : kind === "claim"
                  ? "已结算奖励可随时领取，实际到账按协议扣除相关费用。"
                  : "实际结算结果仍受协议容量、价格状态及发行条件影响。",
          )}
        </p>
        <details className="action-rules">
          <summary>{t("了解规则")}</summary>
          <p>
            {t(
              kind === "participate"
                ? "本次参与资金进入协议后不作为可赎回本金；用户获得的是对应的协议头寸与奖励容量。"
                : kind === "unstake"
                  ? "解除质押后覆盖率与当前档位可能降低；历史已结算权益保留。"
                  : kind === "claim"
                    ? "已结算奖励可随时领取，实际到账按协议扣除相关费用。"
                    : "实际结算结果仍受协议容量、价格状态及发行条件影响。",
            )}
          </p>
        </details>
        <Modal
          open={open}
          onOpenChange={(v) => {
            if (!processing) setOpen(v);
          }}
          title={t(cta)}
          description={t("请核对项目、金额与预计结果。")}
          trigger={
            <Button
              disabled={!quote || !!error || processing}
              onClick={() => {
                setReview({ input, revision: state.book.revision });
                setStatus("");
              }}
            >
              {t(cta)}
            </Button>
          }
        >
          <FinancialIdentity project={project} action={title} />
          <KeyValueList items={items} />
          {t(
            kind === "participate" && (
              <p className="principal-notice">
                {t("参与资金不作为可赎回本金。")}
              </p>
            ),
          )}
          <Button disabled={processing || !review} onClick={execute}>
            {t(processing ? "处理中…" : "确认操作")}
          </Button>
          <p role="status" aria-live="polite">
            {t(processing ? "正在处理操作…" : "")}
          </p>
        </Modal>
        <p role="status" aria-live="polite" className="trade-status">
          {t(status)}
        </p>
      </div>
    </DetailCard>
  );
}
export function ParticipatePanel({ project }: { project: Project }) {
  const { t } = useLocale();

  const s = useOperating(project);
  return (
    <>
      <div className="operating-layout">
        <OperatingActionForm project={project} kind="participate" />
        <DetailCard title={t("我的参与概览")}>
          <KeyValueList
            items={[
              { label: "活跃头寸价值", value: amount(s.principal, "USDT") },
              { label: "独立批次数量", value: s.member.lots.length },
              {
                label: "推荐关系",
                value: s.member.bound ? (
                  s.member.sponsor ? (
                    <WalletAddress address={s.member.sponsor} />
                  ) : (
                    "创建者根身份"
                  )
                ) : (
                  "首次参与时绑定项目根关系"
                ),
              },
            ]}
          />
        </DetailCard>
      </div>
      <PositionLots project={project} />
    </>
  );
}
export function StakePanel({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  const { t } = useLocale();

  const s = useOperating(project);
  const [side, setSide] = useState("stake");
  const next = nextTier(
    s.principal,
    BigInt(s.member.staked),
    s.prices?.stake ?? null,
  );
  return (
    <>
      <div className="operating-layout">
        <DetailCard title={t("质押操作")}>
          <ProductTabs
            label={t("质押方向")}
            items={[
              { value: "stake", label: "质押" },
              { value: "unstake", label: "解除质押" },
            ]}
            value={side}
            onChange={setSide}
          >
            <OperatingActionForm
              key={side}
              project={project}
              kind={side === "stake" ? "stake" : "unstake"}
            />
          </ProductTabs>
        </DetailCard>
        <DetailCard title={t("覆盖率与档位")}>
          <KeyValueList
            items={[
              {
                label: "钱包代币余额",
                value: amount(s.tokenBalance, project.symbol),
              },
              {
                label: "我的质押",
                value: amount(s.member.staked, project.symbol),
              },
              {
                label: "质押参考价值",
                value: s.prices
                  ? amount(
                      (BigInt(s.member.staked) * s.prices.stake) / UNIT,
                      "USDT",
                    )
                  : "N/A",
              },
              { label: "活跃头寸价值", value: amount(s.principal, "USDT") },
              { label: "当前覆盖率", value: coverageText(s.coverage) },
              { label: "当前档位", value: tierText(s.level.index) },
              {
                label: "当前理论日率",
                value:
                  s.coverage === null ? "N/A" : `${s.level.rateBps / 100}%`,
              },
              {
                label: "下一档覆盖率",
                value: next
                  ? `${next.target}%`
                  : s.coverage === null
                    ? "N/A"
                    : "已达最高档",
              },
              {
                label: "达到下一档还需",
                value: next
                  ? amount(next.additional, project.symbol)
                  : s.coverage === null
                    ? "N/A"
                    : "0",
              },
            ].filter(
              (item) =>
                !compact ||
                ["当前档位", "下一档覆盖率", "达到下一档还需"].includes(
                  item.label,
                ),
            )}
          />
          {t(
            !s.prices && (
              <p className="cap-notice">
                {t(
                  "当前有效价格不可用，质押覆盖率暂不可计算。解除质押仍可操作。",
                )}
              </p>
            ),
          )}
          {!compact && (
            <p className="small-note">
              {t("实际结算结果仍受协议容量、价格状态及发行条件影响。")}
            </p>
          )}
        </DetailCard>
      </div>
      {!compact && (
        <DetailCard title={t("覆盖率档位")}>
          <div className="tier-grid">
            {t(
              ["低于 5%", "5% – <15%", "15% – <30%", "30% – <50%", "≥50%"].map(
                (label, i) => (
                  <div
                    key={label}
                    className={s.level.index === i ? "selected" : ""}
                  >
                    <strong>{t(label)}</strong>
                    <span>
                      {t("理论日率")}
                      {t(["0%", "0.2%", "0.4%", "0.6%", "0.8%"][i])}
                    </span>
                  </div>
                ),
              ),
            )}
          </div>
        </DetailCard>
      )}
    </>
  );
}
export function ContributionPanel({ project }: { project: Project }) {
  const { t } = useLocale();

  const s = useOperating(project);
  const [message, setMessage] = useState("");
  const c = s.contribution;
  const code = referralCode(s.key, s.user.wallet);
  return (
    <>
      <div className="project-metrics">
        <MetricCard label={t("贡献值")} value={c ? amount(c.value) : "0"} />
        <MetricCard
          label={t("网络权重")}
          value={c ? coverageText(c.weight) : "0%"}
        />
        <MetricCard label={t("有效网络")} value={c?.activeNetwork ?? 0} />
        <MetricCard
          label={t("网络奖励")}
          value={amount(s.member.networkEarned, project.symbol)}
        />
      </div>
      <ResponsiveGrid>
        <DetailCard title={t("我的网络")}>
          <KeyValueList
            items={[
              { label: "直接连接", value: c?.direct ?? 0 },
              { label: "活跃分支", value: c?.activeBranches ?? 0 },
              {
                label: "推荐人",
                value: s.member.sponsor ? (
                  <WalletAddress address={s.member.sponsor} />
                ) : s.user.wallet === s.book.root ? (
                  "创建者根身份"
                ) : (
                  "首次参与时确定"
                ),
              },
              {
                label: "当前资格",
                value:
                  s.principal > 0n
                    ? "有活跃容量"
                    : "暂无活跃容量，历史权益保留",
              },
            ]}
          />
        </DetailCard>
        <DetailCard title={t("邀请参与")}>
          <p>{t("邀请伙伴参与同一项目，让有效网络贡献持续累积。")}</p>
          <Button
            disabled={!s.member.bound && s.user.wallet !== s.book.root}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${location.origin}${location.pathname}?ref=${encodeURIComponent(code)}`,
                );
                setMessage("推荐链接已复制");
              } catch {
                setMessage("无法复制，请使用下方推荐码");
              }
            }}
          >
            {t("复制推荐链接")}
          </Button>
          {t(
            (s.member.bound || s.user.wallet === s.book.root) && (
              <p className="referral-code">{t(code)}</p>
            ),
          )}
          <p role="status">{t(message)}</p>
        </DetailCard>
      </ResponsiveGrid>
      <details className="card contribution-help">
        <summary>{t("贡献如何形成")}</summary>
        <p>
          {t(
            "贡献来自项目内的有效参与与质押网络。分散而持续的活跃连接有助于形成贡献；奖励以日终确定的结果为准。",
          )}
        </p>
      </details>
    </>
  );
}
export function RewardsPanel({
  project,
  resultOnly = false,
}: {
  project: Project;
  resultOnly?: boolean;
}) {
  const { t } = useLocale();

  const s = useOperating(project);
  const latest = s.book.settlements[0]?.members[s.user.wallet];
  const yesterday = s.book.settlements.find(
    (r) =>
      new Date(Date.parse(r.day + "T00:00:00Z") + 86400000)
        .toISOString()
        .slice(0, 10) === s.book.day,
  )?.members[s.user.wallet];
  const [seconds, setSeconds] = useState(BigInt(s.book.hour * 3600));
  useEffect(() => {
    const start = s.book.displayStartedAt
      ? Date.parse(s.book.displayStartedAt)
      : Date.now();
    setSeconds(
      BigInt(
        Math.min(
          86400,
          s.book.hour * 3600 +
            Math.max(0, Math.floor((Date.now() - start) / 1000)),
        ),
      ),
    );
    const timer = setInterval(
      () =>
        setSeconds(
          BigInt(
            Math.min(
              86400,
              s.book.hour * 3600 +
                Math.max(0, Math.floor((Date.now() - start) / 1000)),
            ),
          ),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [s.book.day, s.book.hour, s.book.displayStartedAt]);
  const used = s.member.lots.reduce((sum, l) => sum + BigInt(l.used), 0n),
    capacity = s.member.lots.reduce((sum, l) => sum + BigInt(l.capacity), 0n);
  return (
    <>
      <div className="project-metrics">
        <MetricCard
          label={t("昨日已结算")}
          value={amount(yesterday?.gross ?? "0", project.symbol)}
        />
        <MetricCard
          label={t("可领取")}
          value={amount(s.member.claimable, project.symbol)}
        />
        <MetricCard
          label={t("累计毛收益")}
          value={amount(s.member.lifetimeEarned, project.symbol)}
        />
        <MetricCard
          label={t("今日展示进度")}
          value={amount(
            displayProgress(BigInt(yesterday?.gross ?? "0"), seconds),
            project.symbol,
          )}
        />
      </div>
      <p className="small-note">
        {t(
          "今日进度仅展示昨日已确定的奖励，不产生新收益，也不影响可领取数量。",
        )}
      </p>
      <div className="operating-layout">
        {!resultOnly && <OperatingActionForm project={project} kind="claim" />}
        <DetailCard title={t("收益与容量")}>
          <KeyValueList
            items={[
              {
                label: "最近参与奖励",
                value: amount(latest?.participation ?? "0", project.symbol),
              },
              {
                label: "最近网络奖励",
                value: amount(latest?.network ?? "0", project.symbol),
              },
              { label: "已使用容量", value: amount(used, "USDT") },
              { label: "剩余容量", value: amount(capacity - used, "USDT") },
              {
                label: "累计毛领取",
                value: amount(s.member.lifetimeClaimed, project.symbol),
              },
              {
                label: "状态",
                value:
                  BigInt(s.member.claimable) > 0n ? "可领取" : "暂无可领取奖励",
              },
              {
                label: "最近结算",
                value: date(s.book.settlements[0]?.completedAt),
              },
            ]}
          />
        </DetailCard>
      </div>
      <ResponsiveGrid>
        <DetailCard title={t("结算历史")}>
          {t(
            s.book.settlements.length ? (
              <ol className="activity-feed">
                {t(
                  s.book.settlements.map((r) => (
                    <li key={r.day}>
                      <div>
                        <strong>
                          {t(r.day)} ·{t(" ")}
                          {t(
                            amount(
                              r.members[s.user.wallet]?.gross ?? "0",
                              project.symbol,
                            ),
                          )}
                        </strong>
                        <small>
                          {t(
                            r.status === "NO_REWARD"
                              ? "无有效奖励候选"
                              : "已最终结算",
                          )}
                        </small>
                      </div>
                    </li>
                  )),
                )}
              </ol>
            ) : (
              <EmptyState
                description={t("日终结算后，你的收益记录将在这里显示。")}
              />
            ),
          )}
        </DetailCard>
        <DetailCard title={t("领取历史")}>
          {t(
            s.book.claims.some((r) => r.wallet === s.user.wallet) ? (
              <ol className="activity-feed">
                {t(
                  s.book.claims
                    .filter((r) => r.wallet === s.user.wallet)
                    .map((r) => (
                      <li key={r.id}>
                        <div>
                          <strong>
                            {t("本次领取")} {t(amount(r.gross, project.symbol))}
                          </strong>
                          <small>
                            {t("实际到账")}{" "}
                            {t(amount(r.received, project.symbol))}{" "}
                            {t("· 已完成")}
                          </small>
                          <small>{t(date(r.timestamp))}</small>
                        </div>
                      </li>
                    )),
                )}
              </ol>
            ) : (
              <EmptyState description={t("暂无领取记录。")} />
            ),
          )}
        </DetailCard>
      </ResponsiveGrid>
    </>
  );
}
export function AssetsPanel({ project }: { project: Project }) {
  const { t } = useLocale();

  const s = useOperating(project);
  return (
    <>
      <ResponsiveGrid>
        <DetailCard title={t("我的代币")}>
          <KeyValueList
            items={[
              {
                label: "钱包余额",
                value: amount(s.tokenBalance, project.symbol),
              },
              {
                label: "已质押",
                value: amount(s.member.staked, project.symbol),
              },
              { label: "活跃头寸价值", value: amount(s.principal, "USDT") },
            ]}
          />
        </DetailCard>
        <DetailCard title={t("我的奖励与网络")}>
          <KeyValueList
            items={[
              {
                label: "可领取",
                value: amount(s.member.claimable, project.symbol),
              },
              {
                label: "累计毛收益",
                value: amount(s.member.lifetimeEarned, project.symbol),
              },
              {
                label: "累计毛领取",
                value: amount(s.member.lifetimeClaimed, project.symbol),
              },
              {
                label: "贡献值",
                value: s.contribution ? amount(s.contribution.value) : "0",
              },
            ]}
          />
        </DetailCard>
      </ResponsiveGrid>
      <PositionLots project={project} />
    </>
  );
}
export function OperatingActivity({ project }: { project: Project }) {
  const { t } = useLocale();

  const key = projectKey(project.chainId, project.tokenContract);
  const activities = useSimulation((s) => s.activities);
  return (
    <DetailCard title={t("项目与个人活动")}>
      {t(
        activities.some((a) => a.projectKey === key) ? (
          <ol className="activity-feed">
            {t(
              activities
                .filter((a) => a.projectKey === key)
                .slice(0, 100)
                .map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{t(a.displayValues.summary)}</strong>
                      <small>
                        {t(shortAddress(a.wallet))} · {t(date(a.timestamp))}
                      </small>
                    </div>
                  </li>
                )),
            )}
          </ol>
        ) : (
          <EmptyState description={t("暂无活动记录。")} />
        ),
      )}
    </DetailCard>
  );
}
export function TransparencyPanel({ project }: { project: Project }) {
  const { t } = useLocale();

  const s = useOperating(project);
  return (
    <DetailCard title={t("公开状态与结果")}>
      <KeyValueList
        items={[
          {
            label: "合约地址",
            value: <ContractAddress address={project.tokenContract} />,
          },
          { label: "项目 ID", value: project.projectId },
          { label: "网络", value: `BSC · ${project.chainId}` },
          {
            label: "当前供应",
            value: amount(
              BigInt(s.book.lifetimeMinted) -
                BigInt(s.book.burned) -
                BigInt(s.book.base.burned),
              project.symbol,
            ),
          },
          { label: "累计销毁", value: number(project.operating?.burnedSupply) },
          { label: "流动性", value: money(project.operating?.liquidity) },
          {
            label: "协议流动性 · POL",
            value: money(project.operating?.polValue),
          },
          {
            label: "价格状态",
            value: <PriceStatusBadge status={project.priceStatus} />,
          },
          {
            label: "最近结算",
            value: date(s.book.settlements[0]?.completedAt),
          },
          {
            label: "更新时间",
            value: date(project.updatedAt ?? project.operating?.updatedAt),
          },
        ]}
      />
    </DetailCard>
  );
}
export function PersonalOverview({ project }: { project: Project }) {
  const { t } = useLocale();

  const s = useOperating(project);
  return (
    <ResponsiveGrid>
      <DetailCard title={t("我的协议状态")}>
        <KeyValueList
          items={[
            { label: "活跃头寸", value: amount(s.principal, "USDT") },
            {
              label: "我的质押",
              value: amount(s.member.staked, project.symbol),
            },
            { label: "我的覆盖率", value: coverageText(s.coverage) },
            {
              label: "贡献值",
              value: s.contribution ? amount(s.contribution.value) : "0",
            },
            {
              label: "网络权重",
              value: s.contribution
                ? coverageText(s.contribution.weight)
                : "0%",
            },
            { label: "有效网络", value: s.contribution?.activeNetwork ?? 0 },
          ]}
        />
      </DetailCard>
      <DetailCard title={t("我的已结算权益")}>
        <KeyValueList
          items={[
            {
              label: "最近已结算",
              value: amount(
                s.book.settlements[0]?.members[s.user.wallet]?.gross ?? "0",
                project.symbol,
              ),
            },
            {
              label: "可领取",
              value: amount(s.member.claimable, project.symbol),
            },
            {
              label: "我的钱包余额",
              value: amount(s.tokenBalance, project.symbol),
            },
          ]}
        />
      </DetailCard>
    </ResponsiveGrid>
  );
}
