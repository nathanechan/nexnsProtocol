"use client";
import type { Project } from "../domain/models";
import { useOperating } from "./operating-panels";
import { pendingPresentationReward } from "../simulation/presentation-runtime";
import { displayAmount } from "../domain/economics/amount";
import { useLocale } from "../i18n/locale";
export function AccruingRewards({ project }: { project: Project }) {
  const s = useOperating(project),
    { locale } = useLocale();
  if (!s.member.lots.some((l) => l.status === "ACTIVE")) return null;
  const value = pendingPresentationReward(s.book, s.user.wallet);
  return (
    <div className="live-reward-preview">
      <span>
        {locale === "en" ? "Pending reward · estimated" : "待结算收益 · 预估"}
      </span>
      <strong data-pending-reward>
        {displayAmount(value, 6)} {project.symbol}
      </strong>
    </div>
  );
}
