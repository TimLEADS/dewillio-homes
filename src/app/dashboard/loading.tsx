import { PageSkeleton } from "@/components/PageSkeleton";

export default function DashboardLoading() {
  return <PageSkeleton stats={6} panels={2} />;
}
