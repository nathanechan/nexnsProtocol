"use client";
import Link from "next/link";
import type { Project, Activity } from "../domain/models";
import { useLocale } from "../i18n/locale";
import { shortAddress } from "../domain/identity";
import { date, activityAmount } from "../product/format";
import {
  DetailCard,
  KeyValueList,
  ContractAddress,
  WalletAddress,
  EmptyState,
} from "./ui";
export function PublicInfo({ project }: { project: Project }) {
  const { t } = useLocale();

  return (
    <div className="project-public-info">
      <DetailCard title={t("项目资料")}>
        <p className="project-description" data-user-text>
          {project.description}
        </p>
        <KeyValueList
          items={[
            {
              label: "项目名称",
              value: <span data-user-text>{project.name}</span>,
            },
            {
              label: "合约地址",
              value: <ContractAddress address={project.tokenContract} />,
            },
            {
              label: "创建者",
              value: <WalletAddress address={project.creatorWallet} />,
            },
            { label: "网络", value: `BSC · ${project.chainId}` },
            { label: "创建时间", value: date(project.createdAt) },
            { label: "项目 ID", value: project.projectId },
          ]}
        />
        <Link className="text-link" href={`/studio/${project.projectId}`}>
          {t("管理 ↗")}
        </Link>
        <div className="public-links">
          {t(
            project.links?.length ? (
              project.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(l.label)} ↗
                </a>
              ))
            ) : (
              <span>{t("暂无项目链接")}</span>
            ),
          )}
        </div>
      </DetailCard>
    </div>
  );
}
export function ProjectActivity({ activities }: { activities: Activity[] }) {
  const { t } = useLocale();

  return (
    <DetailCard title={t("最近活动")}>
      {t(
        activities.length ? (
          <ol className="activity-feed">
            {t(
              [...activities]
                .sort(
                  (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
                )
                .slice(0, 50)
                .map((a) => (
                  <li key={a.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{t(a.displayValues.summary)}</strong>
                      <small>
                        {t(shortAddress(a.wallet))}
                        {t(
                          a.displayValues.received
                            ? ` · 获得 ${activityAmount(a.displayValues.received)} ${a.displayValues.receivedAsset}`
                            : "",
                        )}
                      </small>
                      <small>{t(date(a.timestamp))}</small>
                    </div>
                  </li>
                )),
            )}
          </ol>
        ) : (
          <EmptyState description={t("当前项目暂无公开活动记录。")} />
        ),
      )}
    </DetailCard>
  );
}
