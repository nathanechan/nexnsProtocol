import { Suspense } from "react";
import { notFound } from "next/navigation";
import { VisualPreview } from "../../components/visual-preview";
import "./preview.css";

export const metadata = { title: "NEXNS · Visual direction 01" };

export default function Page() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_NEXUS_DEMO_CONTROLS !== "true"
  )
    notFound();
  return (
    <Suspense fallback={<div role="status">NEXNS</div>}>
      <VisualPreview />
    </Suspense>
  );
}
