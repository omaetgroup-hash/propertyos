import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import DealResults from "./DealResults.tsx";
import type { DealInputs } from "@/lib/deal-calculator.ts";

type Opportunity = Doc<"opportunities">;

interface OpportunityDialogProps {
  open: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
}

const defaultInputs: DealInputs = {
  numberOfRooms: 0,
  bedsPerRoom: 1,
  pricingType: "weekly",
  pricePerUnit: 0,
  occupancyRate: 80,
  leaseCost: 0,
  power: 0,
  water: 0,
  internet: 0,
  cleaning: 0,
  maintenance: 0,
  otherExpenses: 0,
};

export default function OpportunityDialog({ open, onClose, opportunity }: OpportunityDialogProps) {
  const createOpportunity = useMutation(api.opportunities.create);
  const updateOpportunity = useMutation(api.opportunities.update);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"evaluating" | "approved" | "rejected" | "converted">("evaluating");
  const [inputs, setInputs] = useState<DealInputs>(defaultInputs);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(opportunity);

  useEffect(() => {
    if (opportunity) {
      setName(opportunity.name);
      setLocation(opportunity.location);
      setNotes(opportunity.notes ?? "");
      setStatus(opportunity.status);
      setInputs({
        numberOfRooms: opportunity.numberOfRooms,
        bedsPerRoom: opportunity.bedsPerRoom,
        pricingType: opportunity.pricingType,
        pricePerUnit: opportunity.pricePerUnit,
        occupancyRate: opportunity.occupancyRate,
        leaseCost: opportunity.leaseCost,
        power: opportunity.power,
        water: opportunity.water,
        internet: opportunity.internet,
        cleaning: opportunity.cleaning,
        maintenance: opportunity.maintenance,
        otherExpenses: opportunity.otherExpenses,
      });
    } else {
      setName("");
      setLocation("");
      setNotes("");
      setStatus("evaluating");
      setInputs(defaultInputs);
    }
  }, [opportunity, open]);

  const setNum = (key: keyof DealInputs, raw: string) => {
    const val = parseFloat(raw);
    setInputs((prev) => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
  };

  const handleSave = async () => {
    if (!name.trim() || !location.trim()) {
      toast.error("Name and location are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        location: location.trim(),
        notes: notes.trim() || undefined,
        status,
        ...inputs,
      };
      if (isEdit && opportunity) {
        await updateOpportunity({ id: opportunity._id as Id<"opportunities">, ...payload });
        toast.success("Opportunity updated.");
      } else {
        await createOpportunity(payload);
        toast.success("Opportunity created.");
      }
      onClose();
    } catch {
      toast.error("Failed to save opportunity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Opportunity" : "New Opportunity"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* LEFT: Inputs */}
          <div className="space-y-5">
            {/* Property Details */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Property Details</h3>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g. 42 Queen St Boardinghouse" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g. Auckland, NZ" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Any notes about this deal..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none h-16" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evaluating">Evaluating</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <Separator />

            {/* Capacity */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Capacity</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Number of Rooms</Label>
                  <Input type="number" min="0" value={inputs.numberOfRooms || ""} onChange={(e) => setNum("numberOfRooms", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Beds per Room</Label>
                  <Input type="number" min="1" value={inputs.bedsPerRoom || ""} onChange={(e) => setNum("bedsPerRoom", e.target.value)} placeholder="1" />
                </div>
              </div>
            </section>

            <Separator />

            {/* Revenue */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue Model</h3>
              <div className="space-y-2">
                <Label>Pricing Type</Label>
                <Select value={inputs.pricingType} onValueChange={(v) => setInputs((p) => ({ ...p, pricingType: v as "nightly" | "weekly" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly (per bed)</SelectItem>
                    <SelectItem value="nightly">Nightly (per bed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price per Bed ({inputs.pricingType === "nightly" ? "night" : "week"}) ($)</Label>
                  <Input type="number" min="0" step="0.01" value={inputs.pricePerUnit || ""} onChange={(e) => setNum("pricePerUnit", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Occupancy Rate (%)</Label>
                  <Input type="number" min="0" max="100" value={inputs.occupancyRate || ""} onChange={(e) => setNum("occupancyRate", e.target.value)} placeholder="80" />
                </div>
              </div>
            </section>

            <Separator />

            {/* Expenses */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Weekly Expenses ($)</h3>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["leaseCost", "Lease Cost"],
                    ["power", "Power"],
                    ["water", "Water"],
                    ["internet", "Internet"],
                    ["cleaning", "Cleaning"],
                    ["maintenance", "Maintenance"],
                    ["otherExpenses", "Other"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={inputs[key] || ""}
                      onChange={(e) => setNum(key, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: Live Results */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Analysis</h3>
            <DealResults inputs={inputs} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Opportunity"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
