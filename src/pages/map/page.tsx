import { MapPin } from "lucide-react";

export default function MapPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Map View</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualise your portfolio on a map</p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl text-muted-foreground">
        <div className="text-center space-y-2">
          <MapPin className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm">Map view — coming in the Mapping and Image Uploads milestone</p>
        </div>
      </div>
    </div>
  );
}
