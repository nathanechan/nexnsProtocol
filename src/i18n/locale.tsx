"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { mockProjects } from "../data/mock";
import { useSimulation } from "../simulation/store";
import { messages } from "./messages";
export type Locale = "zh-CN" | "en";
export const LOCALE_KEY = "nexns-locale";
const chinese: Record<string, string> = {
  "NETWORK OVERVIEW": "网络总览",
  "NEXNS NETWORK": "网络",
  "EXPLORE ECONOMIES": "探索",
  "PROJECT ECONOMY": "项目",
  "CREATE ECONOMY": "创建项目",
  "CREATOR STUDIO": "创建者工作室",
  "PROTOCOL TRANSPARENCY": "协议透明度",
  PROTOCOL: "协议",
  "P ECOSYSTEM": "NEXNS",
  "MY NEXNS": "资产",
  Logo: "标志",
  "Logo 图片": "标志图片",
  Website: "官网",
  Docs: "文档",
  "X / Twitter": "X",
  "Contribution Value": "贡献值",
  "Network Weight": "网络权重",
  "Active Network": "有效网络",
  "Network Reward": "网络奖励",
  Position: "头寸",
  Positions: "头寸",
  Projects: "项目",
  Assets: "资产",
  Stakes: "质押",
  Claim: "领取",
  Stake: "质押",
  Operating: "运行中",
  "Curve Stage": "曲线发行",
  "NEXNS Token": "NEXNS 代币",
};
const phrases = Object.keys(messages)
  .filter((k) => k.length > 1)
  .sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrasePattern = new RegExp(phrases.map(escape).join("|"), "g");
// Known product copy is translated; project names and token symbols stay verbatim.
export function translateText(
  value: string,
  locale: Locale,
  identities: string[] = mockProjects.flatMap((p) => [
    p.name,
    ...(p.isPlatformToken ? [] : [p.symbol]),
  ]),
): string {
  const normalize = (text: string) =>
    text
      .replace(/NEXUS/g, "NEXNS")
      .replace(/经济体/g, "项目")
      .replace(/模拟处理失败/g, "处理失败")
      .replace(/模拟交易失败/g, "交易失败")
      .replace(/演示用户情景已加载/g, "参与状态已更新")
      .replace(/演示网络已更新/g, "网络已更新")
      .replace(/DEMO-LOT-/g, "")
      .replace(/NX-DEMO-/g, "NX-");
  const normalized = normalize(value).replace(/\s+/g, " ").trim();
  if (locale === "en" && messages[normalized])
    return (
      (value.match(/^\s*/)?.[0] ?? "") +
      messages[normalized] +
      (value.match(/\s*$/)?.[0] ?? "")
    );
  if (locale === "zh-CN" && chinese[normalized]) return chinese[normalized];
  const protectedValues = [...new Set(identities)].sort(
    (a, b) => b.length - a.length,
  );
  let text = value;
  protectedValues.forEach((name, i) => {
    if (name) text = text.replaceAll(name, `\uE000${i}\uE001`);
  });
  text = normalize(text);
  if (locale === "en") {
    if (/^我的 (.+) 余额$/.test(text.trim()))
      text = text.trim().replace(/^我的 (.+) 余额$/, "My $1 balance");
    else if (/^找到 \d+ 个项目$/.test(text.trim()))
      text = text.trim().replace(/^找到 (\d+) 个项目$/, "$1 projects found");
    else if (/^复制合约地址 /.test(text))
      text = text.replace("复制合约地址 ", "Copy contract address ");
    else text = text.replace(phrasePattern, (k) => messages[k]);
  } else
    text = text
      .replace(/Logo/g, "标志")
      .replace(/贡献值 \/ Contribution Value/g, "贡献值");
  return text.replace(
    /\uE000(\d+)\uE001/g,
    (_, i) => protectedValues[Number(i)],
  );
}
export function localizeNode<T>(value: T, locale: Locale, names?: string[]): T {
  if (typeof value === "string")
    return translateText(value, locale, names) as T;
  if (Array.isArray(value))
    return value.map((v) => localizeNode(v, locale, names)) as T;
  return value;
}
const defaultContext = {
  locale: "zh-CN" as Locale,
  setLocale: (_locale: Locale) => {
    void _locale;
  },
  t: <T,>(v: T) => localizeNode(v, "zh-CN"),
  content: (value: string) => value,
};
const LocaleContext = createContext(defaultContext);
export function LocaleProvider({
  children,
  initialLocale = "zh-CN",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const projects = useSimulation((s) => s.projects);
  const names = useMemo(
    () =>
      Object.values(projects).flatMap((p) => [
        p.name,
        ...(p.isPlatformToken ? [] : [p.symbol]),
      ]),
    [projects],
  );
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      if (saved === "en" || saved === "zh-CN") setLocale(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const context = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        setLocale(next);
        try {
          localStorage.setItem(LOCALE_KEY, next);
        } catch {}
      },
      t: <T,>(value: T) => localizeNode(value, locale, names),
      content: (value: string) =>
        locale === "en" ? (messages[value] ?? value) : value,
    }),
    [locale, names],
  );
  return (
    <LocaleContext.Provider value={context}>{children}</LocaleContext.Provider>
  );
}
export function useLocale() {
  return useContext(LocaleContext);
}
