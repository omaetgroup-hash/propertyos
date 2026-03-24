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
import { COMPLIANCE_TYPES } from "@/lib/locale.ts";

const schema = z.object({
  propertyId: z.string().min(1, "Select a property"),
  title: z.string().min(1, "Title required"),
  type: z.enum([
    "healthy_homes", "bwof", "rta_nz", "insulation", "meth_testing",
    "bca", "rta_au", "pool_safety", "nabers", "nathers",
    "smoke_alarm", "fire_safety", "electrical_wof", "asbestos",
    "building_consent", "insurance", "public_liability", "other",
  ]),
  authority: z.string().optional(),
  dueDate: z.string().min(1, "Due date required"),
  renewalDate: z.string().optional(),
  status: z.enum(["compliant", "pending", "overdue", "expired"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Props = { open: boolean; onClose: () => void };

export default function AddComplianceDialog({ open, onClose }: Props) {
  const create = useMutation(api.compliance.create);
  const properties = useQuery(api.properties.list, {});

  const today = new Date().toISOString().split("T")[0] as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: "", title: "", type: "smoke_alarm",
      authority: "", dueDate: today, renewalDate: "",
      status: "pending", notes: "",
    },
  });

  const selectedType = form.watch("type");

  // Auto-fill title when type is selected
  function handleTypeChange(value: FormValues["type"]) {
    form.setValue("type", value);
    const label = COMPLIANCE_TYPES.find((t) => t.value === value)?.label ?? "";
    if (!form.getValues("title")) {
      form.setValue("title", label);
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      await create({
        propertyId: values.propertyId as Id<"properties">,
        title: values.title,
        type: values.type,
        authority: values.authority || undefined,
        dueDate: values.dueDate,
        renewalDate: values.renewalDate || undefined,
        status: values.status,
        notes: values.notes || undefined,
      });
      toast.success("Compliance item added");
      form.reset();
      onClose();
    } catch {
      toast.error("Failed to add compliance item");
    }
  }

  function handleClose() { form.reset(); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Compliance Item</DialogTitle>
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

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Compliance Type</FormLabel>
                <Select value={field.value} onValueChange={(v) => handleTypeChange(v as FormValues["type"])}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="smoke_alarm" disabled className="text-muted-foreground text-xs font-semibold">— Both Countries —</SelectItem>
                    {COMPLIANCE_TYPES.filter((t) => t.country === "both").map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                    <SelectItem value="healthy_homes" disabled className="text-muted-foreground text-xs font-semibold">— New Zealand —</SelectItem>
                    {COMPLIANCE_TYPES.filter((t) => t.country === "nz").map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                    <SelectItem value="bca" disabled className="text-muted-foreground text-xs font-semibold">— Australia —</SelectItem>
                    {COMPLIANCE_TYPES.filter((t) => t.country === "au").map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="e.g. Smoke Alarm Compliance 2025" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="authority" render={({ field }) => (
              <FormItem>
                <FormLabel>Issuing Authority <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input placeholder="e.g. Auckland Council" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="renewalDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Renewal Date <span className="text-muted-foreground font-normal">(opt)</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
