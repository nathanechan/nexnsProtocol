import { notFound } from "next/navigation";
import { MyNexus } from "../../components/my-nexus";
import { CreateEconomy } from "../../components/create-economy";
import { ProtocolPage } from "../../components/protocol-page";
import { PEcosystem } from "../../components/p-ecosystem";
import { NetworkPage } from "../../components/network-page";
import { ExplorePage } from "../../components/explore-page";
import { Skeleton } from "../../components/ui";
import { Suspense } from "react";
const sections = [
  "network",
  "explore",
  "my-nexus",
  "p-ecosystem",
  "protocol",
  "create",
];
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  if (section === "my-nexus") return <MyNexus />;
  if (section === "protocol") return <ProtocolPage />;
  if (section === "p-ecosystem") return <PEcosystem />;
  if (section === "create") return <CreateEconomy />;
  if (section === "network") return <NetworkPage />;
  if (section === "explore")
    return (
      <Suspense fallback={<Skeleton />}>
        <ExplorePage />
      </Suspense>
    );
  return null;
}
