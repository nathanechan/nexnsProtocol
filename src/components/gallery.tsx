"use client";
import { useState } from "react";
import { mockProjects } from "../data/mock";
import { ProjectIdentity } from "./identity";
import {
  Button,
  DataFreshness,
  DataTable,
  DetailCard,
  EmptyState,
  ErrorState,
  InlineAlert,
  InlineGroup,
  Input,
  KeyValueList,
  LifecycleBadge,
  MetricCard,
  Modal,
  NumberInput,
  PageHeader,
  PriceStatusBadge,
  ResponsiveGrid,
  SearchInput,
  Section,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  StatusCard,
  SystemStatus,
  Tabs,
  Toast,
  WalletAddress,
} from "./ui";
export function Gallery() {
  const [selected, setSelected] = useState("56");
  return (
    <Stack>
      <PageHeader
        eyebrow="DEVELOPMENT ONLY"
        title="设计系统"
        description="组件、状态与响应式布局的开发检查入口。"
      />
      <ResponsiveGrid>
        <MetricCard label="可用数据" value={null} detail="缺失值显示 N/A" />
        <MetricCard label="示例数值" value="100,000" detail="仅用于组件展示" />
        <StatusCard title="状态卡片" description="结果优先，清晰呈现。" />
      </ResponsiveGrid>
      <Section title="身份与状态">
        <DetailCard title="项目身份">
          <ProjectIdentity project={mockProjects[0]} />
          <WalletAddress address={mockProjects[0].creatorWallet} />
          <InlineGroup>
            {(
              [
                "CURVE_OPEN",
                "MIGRATION_READY",
                "MIGRATING",
                "OPERATING",
              ] as const
            ).map((s) => (
              <LifecycleBadge showHealthy key={s} state={s} />
            ))}
          </InlineGroup>
          <InlineGroup>
            {(
              [
                "VALID",
                "PROTECTED",
                "PRICE_DISCOVERY",
                "PRICE_INVALID",
              ] as const
            ).map((s) => (
              <PriceStatusBadge showHealthy key={s} status={s} />
            ))}
          </InlineGroup>
          <DataFreshness timestamp={null} />
          <SystemStatus status="healthy" />
        </DetailCard>
      </Section>
      <ResponsiveGrid>
        <DetailCard title="加载">
          <Skeleton />
        </DetailCard>
        <DetailCard title="空状态">
          <EmptyState description="尚未产生记录。" />
        </DetailCard>
        <DetailCard title="错误">
          <ErrorState onRetry={() => {}} />
        </DetailCard>
      </ResponsiveGrid>
      <DetailCard title="控件">
        <Stack>
          <InlineGroup>
            <Button>主要操作</Button>
            <Button variant="secondary">次要操作</Button>
            <Button disabled>不可用</Button>
            <Modal
              title="示例对话框"
              description="支持键盘、焦点限制和 Escape 关闭。"
              trigger={<Button variant="ghost">打开对话框</Button>}
            >
              <p>组件示例内容。</p>
            </Modal>
          </InlineGroup>
          <label>
            文本输入
            <Input placeholder="项目名称" />
          </label>
          <label>
            数量
            <NumberInput placeholder="0.00" />
          </label>
          <label>
            搜索
            <SearchInput placeholder="合约地址" />
          </label>
          <Select
            label="链"
            options={[{ value: "56", label: "BSC" }]}
            value={selected}
            onChange={setSelected}
          />
          <Tabs
            items={[
              { label: "总览", content: "总览内容" },
              { label: "活动", content: "活动内容" },
            ]}
          />
          <SegmentedControl
            items={[
              { label: "日", content: "日视图" },
              { label: "周", content: "周视图" },
            ]}
          />
          <InlineAlert>模拟数据提示</InlineAlert>
          <Toast message="" />
          <KeyValueList
            items={[
              { label: "价格", value: null },
              { label: "阶段", value: "曲线发行" },
            ]}
          />
        </Stack>
      </DetailCard>
      <DataTable
        caption="表格示例"
        columns={["字段", "结果"]}
        rows={[
          ["参考值", null],
          ["状态", "就绪"],
        ]}
      />
    </Stack>
  );
}
