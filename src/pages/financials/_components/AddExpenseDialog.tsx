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
import { EXPENSE_CATEGORIES } from "@/lib/locale.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const schema = z.object({
  propertyId: z.string().min(1, "Select a property"),
  category: z.enum([
    "maintenance", "rates", "insurance", "body_corporate",
    "property_management", "landscaping", "utilities",
    "legal", "advertising", "depreciation", "other",
  ]),
  amount: z.coerce.number().min(0.01, "Amount required"),
  date: z.string().min(1, "Date required"),
  description: z.string().min(1, "Description required"),
  vendor: z.string().optional(),
  gstInclusive: z.boolean().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Props = { open: boolean; onClose: () => void };

export default function AddExpenseDialog({ open, onClose }: Props) {
  const createExpense = useMutation(api.expenses.create);
  const properties = useQuery(api.properties.list, {});

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: "", category: "maintenance",
      amount: 0, date: today,
      description: "", vendor: "",
      gstInclusive: true,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createExpense({
        propertyId: values.propertyId as Id<"properties">,
        category: values.category,
        amount: values.amount,
        date: values.date,
        description: values.description,
        vendor: values.vendor || undefined,
        gstInclusive: values.gstInclusive,
      });
      toast.success("Expense recorded");
      form.reset({ propertyId: values.propertyId, category: values.category, amount: 0, date: today, description: "", vendor: "", gstInclusive: true });
      onClose();
    } catch {
      toast.error("Failed to record expense");
    }
  }

  function handleClose() { form.reset(); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
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

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="e.g. Hot water cylinder replacement" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="vendor" render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor / Supplier <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input placeholder="e.g. Smith Plumbing Ltd" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="gstInclusive" render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Checkbox id="gst" checked={field.value ?? false} onCheckedChange={field.onChange} />
                  <Label htmlFor="gst" className="cursor-pointer text-sm">Amount includes GST (15% NZ / 10% AU)</Label>
                </div>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Record Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
