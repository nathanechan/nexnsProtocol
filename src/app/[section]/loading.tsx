import { ResponsiveGrid, Skeleton } from "../../components/ui";
export default function Loading() {
  return (
    <ResponsiveGrid>
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </ResponsiveGrid>
  );
}
