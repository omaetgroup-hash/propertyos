import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const schema = z.object({
  propertyId: z.string().min(1, "Select a property"),
  unitId: z.string().min(1, "Select a unit"),
  tenantId: z.string().min(1, "Select a tenant"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  weeklyRent: z.coerce.number().min(1, "Weekly rent required"),
  bondAmount: z.coerce.number().min(0, "Bond amount required"),
  status: z.enum(["pending", "active", "periodic", "expired", "terminated"]),
  rtaLodged: z.boolean().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = { open: boolean; onClose: () => void };

export default function AddLeaseDialog({ open, onClose }: Props) {
  const createLease = useMutation(api.leases.create);
  const properties = useQuery(api.properties.list, {});
  const tenants = useQuery(api.tenants.list, {});

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: "", unitId: "", tenantId: "",
      startDate: "", endDate: "",
      weeklyRent: 0, bondAmount: 0,
      status: "active", rtaLodged: false, notes: "",
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const units = useQuery(
    api.units.listByProperty,
    selectedPropertyId ? { propertyId: selectedPropertyId as Id<"properties"> } : "skip"
  );

  // Auto-fill bond = 4 weeks rent (NZ/AU standard max)
  const weeklyRent = form.watch("weeklyRent");

  async function onSubmit(values: FormValues) {
    try {
      await createLease({
        propertyId: values.propertyId as Id<"properties">,
        unitId: values.unitId as Id<"units">,
        tenantId: values.tenantId as Id<"tenants">,
        startDate: values.startDate,
        endDate: values.endDate,
        weeklyRent: values.weeklyRent,
        bondAmount: values.bondAmount,
        status: values.status,
        rtaLodged: values.rtaLodged,
        notes: values.notes || undefined,
      });
      toast.success("Tenancy agreement added");
      form.reset();
      onClose();
    } catch {
      toast.error("Failed to add tenancy");
    }
  }

  function handleClose() { form.reset(); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Tenancy Agreement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Property */}
            <FormField control={form.control} name="propertyId" render={({ field }) => (
              <FormItem>
                <FormLabel>Property</FormLabel>
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue("unitId", ""); }}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(properties ?? []).map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.country === "nz" ? "🇳🇿" : "🇦🇺"} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Unit */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!selectedPropertyId}>
                    <FormControl><SelectTrigger><SelectValue placeholder={selectedPropertyId ? "Select unit..." : "Select property first"} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(units ?? []).map((u) => (
                        <SelectItem key={u._id} value={u._id}>
                          Unit {u.unitNumber}
                          {u.status !== "vacant" && ` (${u.status})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Tenant */}
              <FormField control={form.control} name="tenantId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select tenant..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(tenants ?? []).map((t) => (
                        <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date <span className="text-muted-foreground font-normal">(fixed term)</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Rent + Bond */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="weeklyRent" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekly Rent ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="e.g. 550"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const val = parseFloat(e.target.value) || 0;
                        form.setValue("bondAmount", Math.round(val * 4));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bondAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bond ($) <span className="text-muted-foreground font-normal">max 4 wks</span></FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="e.g. 2200" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Status */}
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Tenancy Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active — Fixed Term</SelectItem>
                    <SelectItem value="periodic">Periodic (Ongoing)</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* RTA Lodged */}
            <FormField control={form.control} name="rtaLodged" render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rtaLodged"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="rtaLodged" className="cursor-pointer">
                    Bond lodged with Tenancy Services / authority
                  </Label>
                </div>
              </FormItem>
            )} />

            {/* Notes */}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea rows={2} placeholder="Any additional notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Tenancy"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
