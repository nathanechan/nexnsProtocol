import { notFound, redirect } from "next/navigation";
import { MyNexus } from "../../components/my-nexus";
import { CreateEconomy } from "../../components/create-economy";
import { ProtocolPage } from "../../components/protocol-page";
import { PEcosystem } from "../../components/p-ecosystem";
import { Skeleton } from "../../components/ui";
import { Suspense } from "react";
import { MarketPage } from "../../components/market-page";
const sections = [
  "network",
  "explore",
  "my-nexus",
  "p-ecosystem",
  "protocol",
  "create",
  "markets",
  "launch",
  "live",
  "portfolio",
  "nexns",
];
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  if (section === "network") redirect("/markets");
  if (section === "my-nexus") redirect("/portfolio");
  if (section === "p-ecosystem") redirect("/nexns");
  if (section === "explore") {
    const values = await searchParams;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(values))
      if (typeof value === "string" && key !== "stage") query.set(key, value);
    redirect(
      `${values.stage === "operating" ? "/live" : "/launch"}${query.size ? `?${query}` : ""}`,
    );
  }
  if (section === "portfolio") return <MyNexus />;
  if (section === "markets" || section === "launch" || section === "live")
    return (
      <Suspense fallback={<Skeleton />}>
        <MarketPage key={section} section={section} />
      </Suspense>
    );
  if (section === "protocol") return <ProtocolPage />;
  if (section === "nexns") return <PEcosystem />;
  if (section === "create") return <CreateEconomy />;
  return null;
}
