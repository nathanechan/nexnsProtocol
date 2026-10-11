import { notFound } from "next/navigation";
import { SimulationConsole } from "../../components/simulation-console";
export default function Page() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_NEXUS_DEMO_CONTROLS !== "true"
  )
    notFound();
  return <SimulationConsole />;
}
