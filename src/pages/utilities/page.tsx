import { Zap } from "lucide-react";

export default function UtilitiesPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Utilities</h1>
        <p className="text-muted-foreground text-sm mt-1">Track utility accounts and bills</p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl text-muted-foreground">
        <div className="text-center space-y-2">
          <Zap className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm">Utilities management — coming soon</p>
        </div>
      </div>
    </div>
  );
}
