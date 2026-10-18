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
import "./markets-v3.css";
import "./terminal-v3.css";
import "./site-v3.css";
import "./live-polish.css";
import "./info-refinement.css";
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
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var preference=localStorage.getItem('nexns-theme');document.documentElement.dataset.theme=preference==='dark'||(preference!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){}`,
          }}
        />
      </head>
      <body data-nexns-app>
        <LocaleProvider>
          <SimulationProvider>
            <AppShell>{children}</AppShell>
          </SimulationProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
