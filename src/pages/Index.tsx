import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import DashboardPage from "./dashboard/page.tsx";

export default function IndexPage() {
  const [searchParams] = useSearchParams();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const isPreviewingStaff =
    currentUser?.role === "admin" && searchParams.get("previewRole") === "staff";

  if (currentUser === undefined) {
    return null;
  }

  if (currentUser?.role === "admin" && !isPreviewingStaff) {
    return <Navigate to="/opportunities" replace />;
  }

  return <DashboardPage />;
}
