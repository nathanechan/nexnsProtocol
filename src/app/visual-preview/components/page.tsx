import { ControlGallery } from "../../../components/control-gallery";
import { notFound } from "next/navigation";
import "./gallery.css";

export const metadata = { title: "NEXNS · Design foundations" };
export default function Page() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_NEXUS_DEMO_CONTROLS !== "true"
  )
    notFound();
  return <ControlGallery />;
}
