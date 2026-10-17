"use client";
import { useLocale } from "../i18n/locale";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateIdentity,
  validateLinks,
  type CreateInput,
} from "../domain/create";
import { simulationStore, useSimulation } from "../simulation/store";
import { projectRoute } from "../domain/identity";
import { Button, Input, KeyValueList, PageHeader, WalletAddress } from "./ui";
import { ProjectLogo } from "./project-logo";
export function CreateEconomy() {
  const { t } = useLocale();

  const router = useRouter();
  const user = useSimulation((s) => s.currentUser);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<CreateInput>({
    name: "",
    symbol: "",
    description: "",
    logo: "N",
    links: ["Website", "X / Twitter", "Telegram", "Discord", "Docs"].map(
      (label) => ({ label, url: "" }),
    ),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "processing" | "success">(
    "idle",
  );
  const change = (field: keyof CreateInput, value: string) => {
    setInput((s) => ({ ...s, [field]: value }));
    setErrors((s) => ({ ...s, [field]: "" }));
  };
  const next = () => {
    const e = step === 0 ? validateIdentity(input) : validateLinks(input.links);
    setErrors(e);
    if (!Object.keys(e).length) setStep(step + 1);
  };
  const create = async () => {
    setStatus("processing");
    try {
      await new Promise((r) => setTimeout(r, 300));
      const key = simulationStore.getState().createProject(input);
      setStatus("success");
      await new Promise((r) => setTimeout(r, 200));
      router.push(projectRoute(simulationStore.getState().projects[key]));
    } catch (e) {
      setStatus("idle");
      setErrors({ form: e instanceof Error ? e.message : "创建失败，请重试" });
    }
  };
  return (
    <div className="secondary-page create-page" data-nexns-ui="v2">
      <PageHeader
        eyebrow={t("创建项目")}
        title={t("创建项目")}
        description=""
      />
      <div className="wizard-layout">
        <section className="card wizard">
          <ol className="wizard-steps" aria-label={t("创建步骤")}>
            {t(
              ["项目身份", "公开链接", "确认创建"].map((label, i) => (
                <li
                  key={label}
                  aria-current={step === i ? "step" : undefined}
                  className={step >= i ? "active" : ""}
                >
                  <span>{t(i + 1)}</span>
                  {t(label)}
                </li>
              )),
            )}
          </ol>
          <h2>{t(["定义项目身份", "添加公开链接", "确认你的项目"][step])}</h2>
          <p className="small-note">
            {t(
              step === 0
                ? "名称与符号可重复，合约地址用于区分每个项目。"
                : step === 1
                  ? "所有链接均为可选。请使用完整的 HTTPS 或 HTTP 地址。"
                  : "核对以下信息，创建后将自动进入项目页面。",
            )}
          </p>
          {t(
            step === 0 ? (
              <div className="wizard-fields identity-fields">
                {(
                  [
                    ["name", t("项目名称")],
                    ["symbol", t("代币符号")],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} htmlFor={`create-${field}`}>
                    {label}
                    <Input
                      id={`create-${field}`}
                      aria-label={label}
                      value={input[field] ?? ""}
                      onChange={(e) => change(field, e.target.value)}
                      aria-invalid={
                        !!(field === "symbol" ? errors.symbol : errors.name)
                      }
                      aria-describedby={`error-${field}`}
                    />
                    <small className="field-error" id={`error-${field}`}>
                      {t(field === "symbol" ? errors.symbol : errors.name)}
                    </small>
                  </label>
                ))}
                <label htmlFor="create-description">
                  {t("简介")}
                  <textarea
                    id="create-description"
                    aria-label={t("简介")}
                    rows={3}
                    value={input.description}
                    onChange={(e) => change("description", e.target.value)}
                    aria-invalid={!!errors.description}
                    aria-describedby="error-description"
                  />
                  <small id="error-description" className="field-error">
                    {t(errors.description)}
                  </small>
                </label>
                <div className="logo-upload">
                  <div className="project-logo">
                    <ProjectLogo
                      logo={input.logo}
                      identity={input.name + input.symbol}
                    />
                  </div>
                  <label htmlFor="create-logo">
                    {t("Logo")}
                    {t(" ")}
                    <span className="small-note">
                      {t("默认图标，或上传 PNG / JPEG / WebP · 最大 2 MB")}
                    </span>
                    <span className="file-upload-control">
                      <span>{t("选择图片")}</span>
                      <input
                        id="create-logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (
                            !["image/png", "image/jpeg", "image/webp"].includes(
                              file.type,
                            ) ||
                            file.size > 2097152
                          ) {
                            setErrors((s) => ({
                              ...s,
                              logo: "请选择不超过 2 MB 的 PNG、JPEG 或 WebP 图片",
                            }));
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () =>
                            change("logo", String(reader.result));
                          reader.onerror = () =>
                            setErrors((s) => ({
                              ...s,
                              logo: "无法读取图片，请重新选择",
                            }));
                          reader.readAsDataURL(file);
                        }}
                        aria-describedby="error-logo"
                      />
                    </span>
                    <small id="error-logo" className="field-error">
                      {t(errors.logo)}
                    </small>
                  </label>
                </div>
              </div>
            ) : step === 1 ? (
              <div className="wizard-fields">
                {t(
                  input.links.map((l, i) => (
                    <label key={l.label} htmlFor={`link-${i}`}>
                      {t(l.label === "X / Twitter" ? "X" : l.label)}
                      <Input
                        id={`link-${i}`}
                        aria-label={t(
                          l.label === "X / Twitter" ? "X" : l.label,
                        )}
                        value={l.url}
                        placeholder={t("https://")}
                        onChange={(e) => {
                          setInput((s) => ({
                            ...s,
                            links: s.links.map((link, j) =>
                              j === i ? { ...link, url: e.target.value } : link,
                            ),
                          }));
                          setErrors((s) => ({ ...s, [l.label]: "" }));
                        }}
                        aria-invalid={!!errors[l.label]}
                        aria-describedby={`link-error-${i}`}
                      />
                      <small className="field-error" id={`link-error-${i}`}>
                        {t(errors[l.label])}
                      </small>
                    </label>
                  )),
                )}
              </div>
            ) : (
              <div className="wizard-review">
                <div className="inline">
                  <div className="project-logo">
                    <ProjectLogo
                      logo={input.logo}
                      identity={input.name + input.symbol}
                    />
                  </div>
                  <div>
                    <h3 data-user-text>{input.name}</h3>
                    <span>
                      {input.symbol} {t("· BSC")}
                    </span>
                  </div>
                </div>
                {input.description && <p data-user-text>{input.description}</p>}
                <KeyValueList
                  items={[
                    {
                      label: "创建者",
                      value: <WalletAddress address={user.wallet} />,
                    },
                    ...input.links
                      .filter((l) => l.url)
                      .map((l) => ({ label: l.label, value: l.url })),
                  ]}
                />
              </div>
            ),
          )}
          <p role="status" aria-live="polite">
            {t(
              status === "processing"
                ? "正在创建项目…"
                : status === "success"
                  ? "创建成功，正在打开项目…"
                  : "",
            )}
          </p>
          {t(
            errors.form && (
              <p role="alert" className="field-error">
                {t(errors.form)}
              </p>
            ),
          )}
          <div className="wizard-actions">
            {t(
              step > 0 && (
                <Button
                  variant="secondary"
                  disabled={status !== "idle"}
                  onClick={() => {
                    setStep(step - 1);
                    setErrors({});
                  }}
                >
                  {t("返回")}
                </Button>
              ),
            )}
            {t(
              step < 2 ? (
                <Button onClick={next}>{t("下一步")}</Button>
              ) : (
                <Button
                  loading={status === "processing"}
                  disabled={status !== "idle"}
                  onClick={create}
                >
                  {t(status === "processing" ? "创建中…" : "创建项目")}
                </Button>
              ),
            )}
          </div>
        </section>
        <aside>
          <details className="card action-rules">
            <summary>{t("查看规则")}</summary>
            <KeyValueList
              items={[
                { label: "初始供应", value: "1,000,000 X" },
                { label: "曲线发行", value: "800,000 X" },
                { label: "迁移预留", value: "200,000 X" },
                { label: "净储备目标", value: "100,000 USDT" },
                { label: "曲线交易手续费", value: "1%" },
              ]}
            />
            <p className="small-note">
              {t(
                "X 代表你的项目代币。发行完成后，项目将在迁移确认后进入运行阶段。",
              )}
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}
