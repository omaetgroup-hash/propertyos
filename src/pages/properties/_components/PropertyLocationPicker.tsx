import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { MapPin } from "lucide-react";

// Default center: NZ
const NZ_CENTER: [number, number] = [-36.8485, 174.7633];

function createPickerIcon(isSet: boolean) {
  const color = isSet ? "#22c55e" : "#f59e0b";
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background-color:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapClickHandler({
  onLocationPick,
}: {
  onLocationPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  open: boolean;
  onClose: () => void;
  propertyId: Id<"properties">;
  currentLat?: number;
  currentLng?: number;
};

export default function PropertyLocationPicker({
  open,
  onClose,
  propertyId,
  currentLat,
  currentLng,
}: Props) {
  const [lat, setLat] = useState<number>(currentLat ?? NZ_CENTER[0]);
  const [lng, setLng] = useState<number>(currentLng ?? NZ_CENTER[1]);
  const [hasSet, setHasSet] = useState(
    currentLat !== undefined && currentLng !== undefined
  );
  const [saving, setSaving] = useState(false);

  const updateProperty = useMutation(api.properties.update);
  const clearLocation = useMutation(api.properties.clearLocation);

  function handleLocationPick(newLat: number, newLng: number) {
    setLat(Math.round(newLat * 1000000) / 1000000);
    setLng(Math.round(newLng * 1000000) / 1000000);
    setHasSet(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProperty({ id: propertyId, lat, lng });
      toast.success("Location saved");
      onClose();
    } catch {
      toast.error("Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await clearLocation({ id: propertyId });
      toast.success("Location cleared");
      setHasSet(false);
      onClose();
    } catch {
      toast.error("Failed to clear location");
    } finally {
      setSaving(false);
    }
  }

  const mapCenter: [number, number] = hasSet ? [lat, lng] : NZ_CENTER;
  const mapZoom = hasSet ? 14 : 5;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Set Property Location
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click anywhere on the map to pin this property's location, or enter
            coordinates manually.
          </p>

          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 320 }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ width: "100%", height: "100%" }}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapClickHandler onLocationPick={handleLocationPick} />
              {hasSet && (
                <Marker
                  position={[lat, lng]}
                  icon={createPickerIcon(true)}
                />
              )}
            </MapContainer>
          </div>

          {/* Manual coordinate inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => {
                  setLat(Number(e.target.value));
                  setHasSet(true);
                }}
                placeholder="-36.848500"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => {
                  setLng(Number(e.target.value));
                  setHasSet(true);
                }}
                placeholder="174.763300"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {!hasSet && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Click on the map to set a location for this property
            </p>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 w-full">
            {(currentLat !== undefined || currentLng !== undefined) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={saving}
                className="text-muted-foreground hover:text-destructive mr-auto"
              >
                Clear Location
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasSet || saving}>
              {saving ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
