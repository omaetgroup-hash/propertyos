import { FileText } from "lucide-react";

export default function LeasesPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leases</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage lease agreements</p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl text-muted-foreground">
        <div className="text-center space-y-2">
          <FileText className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm">Lease management — coming in the Leases and Financials milestone</p>
        </div>
      </div>
    </div>
  );
}
