import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
import { INSPECTION_TYPES } from "@/lib/locale.ts";

const schema = z.object({
  propertyId: z.string().min(1, "Select a property"),
  unitId: z.string().optional(),
  type: z.enum([
    "move_in", "move_out", "routine", "healthy_homes",
    "maintenance", "compliance", "pre_tenancy",
  ]),
  scheduledDate: z.string().min(1, "Scheduled date required"),
  inspectorName: z.string().min(1, "Inspector name required"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Props = { open: boolean; onClose: () => void };

export default function AddInspectionDialog({ open, onClose }: Props) {
  const create = useMutation(api.inspections.create);
  const properties = useQuery(api.properties.list, {});

  const today = new Date().toISOString().split("T")[0] as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: "", unitId: undefined, type: "routine",
      scheduledDate: today, inspectorName: "", status: "scheduled", notes: "",
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const units = useQuery(
    api.units.listByProperty,
    selectedPropertyId ? { propertyId: selectedPropertyId as Id<"properties"> } : "skip"
  );

  useEffect(() => {
    form.setValue("unitId", undefined);
  }, [selectedPropertyId, form]);

  async function onSubmit(values: FormValues) {
    try {
      await create({
        propertyId: values.propertyId as Id<"properties">,
        unitId: values.unitId ? (values.unitId as Id<"units">) : undefined,
        type: values.type,
        scheduledDate: values.scheduledDate,
        inspectorName: values.inspectorName,
        status: values.status,
        notes: values.notes || undefined,
      });
      toast.success("Inspection scheduled");
      form.reset({ propertyId: values.propertyId, type: values.type, scheduledDate: today, inspectorName: values.inspectorName, status: "scheduled", notes: "" });
      onClose();
    } catch {
      toast.error("Failed to schedule inspection");
    }
  }

  function handleClose() { form.reset(); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField control={form.control} name="propertyId" render={({ field }) => (
              <FormItem>
                <FormLabel>Property</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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

            {units && units.length > 0 && (
              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Whole property" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Whole property</SelectItem>
                      {units.map((u) => (
                        <SelectItem key={u._id} value={u._id}>Unit {u.unitNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Inspection Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {INSPECTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="inspectorName" render={({ field }) => (
              <FormItem>
                <FormLabel>Inspector Name</FormLabel>
                <FormControl><Input placeholder="e.g. Jane Smith" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea placeholder="Access instructions, areas of concern..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
