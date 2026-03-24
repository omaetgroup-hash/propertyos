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
import { Button } from "@/components/ui/button.tsx";
import { UTILITY_TYPES } from "@/lib/locale.ts";

const schema = z.object({
  propertyId: z.string().min(1, "Select a property"),
  unitId: z.string().optional(),
  type: z.enum([
    "electricity", "gas", "water", "broadband",
    "rates", "body_corporate", "rubbish", "other",
  ]),
  provider: z.string().min(1, "Provider name required"),
  accountNumber: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount required"),
  billingDate: z.string().min(1, "Billing date required"),
  dueDate: z.string().min(1, "Due date required"),
  status: z.enum(["paid", "pending", "overdue"]),
});

type FormValues = z.infer<typeof schema>;
type Props = { open: boolean; onClose: () => void };

export default function AddUtilityDialog({ open, onClose }: Props) {
  const createUtility = useMutation(api.utilities.create);
  const properties = useQuery(api.properties.list, {});

  const today = new Date().toISOString().split("T")[0] as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: "", unitId: undefined, type: "electricity",
      provider: "", accountNumber: "", amount: 0,
      billingDate: today, dueDate: today, status: "pending",
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const units = useQuery(
    api.units.listByProperty,
    selectedPropertyId ? { propertyId: selectedPropertyId as Id<"properties"> } : "skip"
  );

  // Reset unit when property changes
  useEffect(() => {
    form.setValue("unitId", undefined);
  }, [selectedPropertyId, form]);

  async function onSubmit(values: FormValues) {
    try {
      await createUtility({
        propertyId: values.propertyId as Id<"properties">,
        unitId: values.unitId ? (values.unitId as Id<"units">) : undefined,
        type: values.type,
        provider: values.provider,
        accountNumber: values.accountNumber || undefined,
        amount: values.amount,
        billingDate: values.billingDate,
        dueDate: values.dueDate,
        status: values.status,
      });
      toast.success("Utility bill recorded");
      form.reset({ propertyId: values.propertyId, type: values.type, provider: "", accountNumber: "", amount: 0, billingDate: today, dueDate: today, status: "pending" });
      onClose();
    } catch {
      toast.error("Failed to record utility bill");
    }
  }

  function handleClose() { form.reset(); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Utility Bill</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Property */}
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

            {/* Unit (optional) */}
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

            {/* Type + Provider */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {UTILITY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="provider" render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl><Input placeholder="e.g. Mercury Energy" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Account number */}
            <FormField control={form.control} name="accountNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input placeholder="e.g. 12345678" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Amount */}
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Billing + Due date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="billingDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Status */}
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Record Bill"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
