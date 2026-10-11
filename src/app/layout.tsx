import type { Metadata } from "next";
import { LocaleProvider } from "../i18n/locale";
import { AppShell } from "../components/app-shell";
import "./globals.css";
import { SimulationProvider } from "../components/simulation-provider";
export const metadata: Metadata = {
  title: "NEXNS",
  description: "NEXNS · 链上经济操作层",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <LocaleProvider>
          <SimulationProvider>
            <AppShell>{children}</AppShell>
          </SimulationProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
