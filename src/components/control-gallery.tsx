"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Input, Select, Modal } from "./ui";
import { ProductTabs } from "./product-tabs";
import { useLocale } from "../i18n/locale";

export function ControlGallery() {
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  const [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false),
    [invalid, setInvalid] = useState(false),
    [value, setValue] = useState(""),
    [tab, setTab] = useState("one"),
    [selection, setSelection] = useState("first"),
    [dialogOpen, setDialogOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="control-gallery">
      <div className="foundation-kicker">NEXNS / DESIGN FOUNDATIONS</div>
      <header className="foundation-heading">
        <div>
          <h1>{zh ? "基础控件与状态" : "Controls & states"}</h1>
          <p>
            {zh
              ? "视觉升级 · Step 2 · 独立组件预览"
              : "Visual upgrade · Step 2 · Component preview"}
          </p>
        </div>
        <Link className="button secondary" href="/visual-preview">
          {zh ? "返回页面样板" : "Page previews"}
        </Link>
      </header>
      <div className="foundation-grid">
        <section className="foundation-card">
          <h2>01 / {zh ? "按钮" : "Buttons"}</h2>
          <p>
            {zh
              ? "主要、次要、轻操作与禁用状态。"
              : "Primary, secondary, quiet and disabled states."}
          </p>
          <div className="foundation-controls">
            <Button>{zh ? "主要操作" : "Primary action"}</Button>
            <Button variant="secondary">{zh ? "次要操作" : "Secondary"}</Button>
            <Button variant="ghost">{zh ? "轻操作" : "Quiet"}</Button>
            <Button disabled>{zh ? "暂不可用" : "Unavailable"}</Button>
          </div>
          <div className="foundation-controls">
            <Button
              loading={busy}
              onClick={() => {
                setBusy(true);
                setComplete(false);
                timer.current = setTimeout(() => {
                  setBusy(false);
                  setComplete(true);
                }, 900);
              }}
            >
              {busy
                ? zh
                  ? "处理中…"
                  : "Processing…"
                : zh
                  ? "预览处理反馈"
                  : "Preview feedback"}
            </Button>
          </div>
          <p
            className={complete ? "trade-status operation-success" : "sr-only"}
            role="status"
          >
            {complete
              ? zh
                ? "操作完成 · 状态已更新"
                : "Complete · State updated"
              : ""}
          </p>
        </section>
        <section className="foundation-card">
          <h2>02 / {zh ? "输入与校验" : "Inputs & validation"}</h2>
          <label htmlFor="foundation-amount">
            {zh ? "金额 · USDT" : "Amount · USDT"}
            <Input
              id="foundation-amount"
              placeholder="0.00"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={invalid}
              aria-describedby="foundation-error"
            />
          </label>
          <p
            id="foundation-error"
            className="field-error"
            role={invalid ? "alert" : undefined}
          >
            {invalid ? (zh ? "请输入有效金额" : "Enter a valid amount") : ""}
          </p>
          <div className="foundation-controls">
            <Button
              variant="ghost"
              aria-pressed={invalid}
              onClick={() => setInvalid(!invalid)}
            >
              {zh ? "切换校验状态" : "Toggle validation"}
            </Button>
          </div>
          <label htmlFor="foundation-disabled">
            {zh ? "禁用输入" : "Disabled input"}
            <Input id="foundation-disabled" disabled value="100.00" />
          </label>
        </section>
        <section className="foundation-card">
          <h2>03 / {zh ? "选择与切换" : "Selection & tabs"}</h2>
          <Select
            label={zh ? "选择项目" : "Select project"}
            value={selection}
            onChange={setSelection}
            options={[
              { value: "first", label: "NEXNS" },
              { value: "second", label: "Mireva" },
            ]}
          />
          <ProductTabs
            label={zh ? "组件标签" : "Component tabs"}
            items={[
              { value: "one", label: zh ? "概览" : "Overview" },
              { value: "two", label: zh ? "记录" : "History" },
            ]}
            value={tab}
            onChange={setTab}
          >
            <p className="foundation-tab-copy">
              {tab === "one"
                ? zh
                  ? "概览内容"
                  : "Overview content"
                : zh
                  ? "记录内容"
                  : "History content"}
            </p>
          </ProductTabs>
          <div className="foundation-controls">
            <span className="badge neutral">
              {zh ? "未开始" : "Not started"}
            </span>
            <span className="badge migrating">
              {zh ? "迁移中" : "Migrating"}
            </span>
          </div>
        </section>
        <section className="foundation-card">
          <h2>04 / {zh ? "弹窗与反馈" : "Dialog & feedback"}</h2>
          <p>
            {zh
              ? "确认层保留焦点管理、Escape 关闭和原有操作方式。"
              : "Confirmation retains focus management, Escape dismissal and existing interactions."}
          </p>
          <Modal
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title={zh ? "确认预览" : "Confirmation preview"}
            description={
              zh
                ? "此弹窗仅展示组件样式，不提交资产操作。"
                : "This preview does not submit an asset action."
            }
            trigger={
              <Button variant="secondary">
                {zh ? "打开弹窗" : "Open dialog"}
              </Button>
            }
          >
            <dl className="key-values">
              <div>
                <dt>{zh ? "金额" : "Amount"}</dt>
                <dd>100.00 USDT</dd>
              </div>
            </dl>
            <Button onClick={() => setDialogOpen(false)}>
              {zh ? "确认" : "Confirm"}
            </Button>
          </Modal>
          <p className="trade-status operation-success">
            {zh
              ? "领取成功 · 已收到 24.50 FIELD"
              : "Claim successful · Received 24.50 FIELD"}
          </p>
          <p className="trade-status operation-error">
            {zh
              ? "操作未完成，请重试"
              : "Action could not complete. Try again."}
          </p>
          <p className="alert">
            {zh
              ? "请核对金额与预计结果。"
              : "Review the amount and expected result."}
          </p>
        </section>
      </div>
      <p className="foundation-note">
        {zh
          ? "本页为设计系统预览，展示金额不写入模拟资产。支持键盘操作与减少动态效果。"
          : "Design system preview. Displayed amounts do not update simulated assets. Keyboard and reduced-motion support included."}
      </p>
    </div>
  );
}
