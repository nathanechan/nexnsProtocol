import Link from "next/link";
import { mockProjects } from "../data/mock";
import { ProjectIdentity } from "./identity";
import {
  DetailCard,
  EmptyState,
  PageHeader,
  ResponsiveGrid,
  Section,
} from "./ui";
const content: Record<
  string,
  { title: string; en: string; description: string; regions: string[] }
> = {
  network: {
    title: "网络总览",
    en: "NETWORK OVERVIEW",
    description: "连接项目生命周期、资产与经济活动的统一产品入口。",
    regions: ["平台状态", "生命周期概览", "网络活动"],
  },
  explore: {
    title: "探索经济体",
    en: "EXPLORE ECONOMIES",
    description: "两大阶段发现池，配合全量项目搜索。",
    regions: ["曲线发行 · Top 100", "运行中 · Top 100"],
  },
  "my-nexus": {
    title: "我的 NEXUS",
    en: "PERSONAL CENTER",
    description: "统一查看个人资产、参与和已结算结果。",
    regions: ["资产总览", "Positions / Stakes", "Rewards / Network"],
  },
  "p-ecosystem": {
    title: "平台生态",
    en: "P ECOSYSTEM",
    description: "平台代币、基础流动性与生态连接。",
    regions: ["NEXUS Token", "NEXUS / USDT 基础池", "生态连接"],
  },
  protocol: {
    title: "协议透明度",
    en: "PROTOCOL TRANSPARENCY",
    description: "面向用户与合作伙伴的公开状态和结果。",
    regions: ["合约注册", "供应与销毁", "结算与价格状态"],
  },
  create: {
    title: "创建经济体",
    en: "CREATE ECONOMY",
    description: "创建者入口已建立。创建向导将在后续阶段实现。",
    regions: ["Identity → Links → Review → Create"],
  },
  studio: {
    title: "经济体工作室",
    en: "ECONOMY STUDIO",
    description: "创建者的数据与资料管理入口，不包含协议管理权限。",
    regions: ["项目概览", "资料与增长", "收入结果"],
  },
};
export function FoundationPage({ page }: { page: string }) {
  const c = content[page];
  return (
    <>
      <PageHeader
        eyebrow={c.en}
        title={c.title}
        description={c.description}
        action={
          page === "network" || page === "explore" ? (
            <Link className="button primary" href="/create">
              创建经济体 ↗
            </Link>
          ) : undefined
        }
      />
      <div className="foundation-banner">
        <span className="badge neutral">STEP 01 · 产品基础</span>
        <p>导航、身份与状态架构已建立。业务数据视图将在后续阶段接入。</p>
      </div>
      <ResponsiveGrid>
        {c.regions.map((r) => (
          <DetailCard key={r} title={r}>
            <EmptyState
              title="产品区域预留"
              description="本阶段建立可复用结构，不展示未经实现的业务结果。"
            />
          </DetailCard>
        ))}
      </ResponsiveGrid>
      {(page === "network" || page === "explore") && (
        <Section title="生命周期样本 · 模拟项目">
          <p className="section-description">
            用于审阅统一项目壳与身份显示，不是 Top 100 排名。
          </p>
          <div className="project-list">
            {mockProjects.map((p) => (
              <ProjectIdentity project={p} key={p.tokenContract} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
