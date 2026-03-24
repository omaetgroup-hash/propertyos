import { Building2 } from "lucide-react";

export default function PropertiesPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your property portfolio</p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl text-muted-foreground">
        <div className="text-center space-y-2">
          <Building2 className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm">Properties management — coming in the next milestone</p>
        </div>
      </div>
    </div>
  );
}
