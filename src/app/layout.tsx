import type { Metadata } from "next";
import { LocaleProvider } from "../i18n/locale";
import { AppShell } from "../components/app-shell";
import "./globals.css";
import "./design-system.css";
import "./market-surfaces.css";
import "./terminal-surfaces.css";
import "./account-surfaces.css";
import "./final-polish.css";
import "./system-v2.css";
import "./flagship-terminal.css";
import "./pages-v2.css";
import { SimulationProvider } from "../components/simulation-provider";
export const metadata: Metadata = {
  title: "NEXNS",
  description: "NEXNS · 链上经济操作层",
  icons: { icon: "/brand/nexns-logo.png", apple: "/brand/nexns-logo.png" },
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
