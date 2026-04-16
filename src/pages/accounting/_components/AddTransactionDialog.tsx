import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { INCOME_CATEGORIES, ACCOUNTING_EXPENSE_CATEGORIES } from "@/lib/locale.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const CATEGORY_VALUES = [
  "rental_income", "bond_income", "late_fees", "other_income",
  "repairs_maintenance", "council_rates", "insurance", "property_management_fees",
  "utilities", "cleaning", "advertising", "legal_fees", "accounting_fees", "other_expenses",
] as const;

const schema = z.object({
  date: z.string().min(1, "Date required"),
  type: z.enum(["income", "expense"]),
  category: z.enum(CATEGORY_VALUES),
  amount: z.coerce.number().min(0.01, "Amount required"),
  gstApplicable: z.boolean(),
  propertyId: z.string().min(1, "Select a property"),
  description: z.string().min(1, "Description required"),
  supplierId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  defaultPropertyId?: string;
};

export default function AddTransactionDialog({ open, onClose, defaultPropertyId }: Props) {
  const createTransaction = useMutation(api.accounting.create);
  const properties = useQuery(api.properties.list, {});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const today = new Date().toISOString().split("T")[0]!;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      type: "income",
      category: "rental_income",
      amount: 0,
      gstApplicable: true,
      propertyId: defaultPropertyId ?? "",
      description: "",
      supplierId: "",
    },
  });

  const txType = useWatch({ control: form.control, name: "type" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const gstApplicable = useWatch({ control: form.control, name: "gstApplicable" });

  // Auto-reset category when type changes
  function handleTypeChange(val: "income" | "expense") {
    form.setValue("type", val);
    form.setValue("category", val === "income" ? "rental_income" : "repairs_maintenance");
  }

  // GST preview (15% NZ standard)
  const gstPreview = gstApplicable && amount > 0
    ? Math.round(amount * (0.15 / 1.15) * 100) / 100
    : 0;
  const netPreview = amount > 0 ? Math.round((amount - gstPreview) * 100) / 100 : 0;

  async function onSubmit(values: FormValues) {
    try {
      let receiptStorageId: Id<"_storage"> | undefined;

      if (receiptFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": receiptFile.type },
          body: receiptFile,
        });
        const { storageId } = await result.json() as { storageId: string };
        receiptStorageId = storageId as Id<"_storage">;
      }

      await createTransaction({
        date: values.date,
        type: values.type,
        category: values.category,
        amount: values.amount,
        gstApplicable: values.gstApplicable,
        propertyId: values.propertyId as Id<"properties">,
        description: values.description,
        supplierId: values.supplierId || undefined,
        receiptStorageId,
      });

      toast.success(`${values.type === "income" ? "Income" : "Expense"} recorded`);
      setReceiptFile(null);
      form.reset({
        date: today,
        type: values.type,
        category: values.category,
        amount: 0,
        gstApplicable: true,
        propertyId: values.propertyId,
        description: "",
        supplierId: "",
      });
      onClose();
    } catch {
      toast.error("Failed to save transaction");
    }
  }

  function handleClose() {
    form.reset();
    setReceiptFile(null);
    onClose();
  }

  const categories = txType === "income" ? INCOME_CATEGORIES : ACCOUNTING_EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  txType === "income"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  txType === "expense"
                    ? "bg-red-500/10 border-red-500/30 text-red-700"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                Expense
              </button>
            </div>

            {/* Property + Date */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="propertyId" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Property</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger>
                    </FormControl>
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

              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder={txType === "income" ? "e.g. Rent — April 2026" : "e.g. Hot water cylinder repair"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Amount + GST */}
            <div className="space-y-2">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($) <span className="text-muted-foreground font-normal text-xs">GST-inclusive if applicable</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="gstApplicable" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="gst-toggle"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="gst-toggle" className="cursor-pointer text-sm">
                      GST applicable (15% NZ)
                    </Label>
                    {gstApplicable && amount > 0 && (
                      <div className="ml-auto flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          GST: ${gstPreview.toFixed(2)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Net: ${netPreview.toFixed(2)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </FormItem>
              )} />
            </div>

            {/* Supplier (optional) */}
            <FormField control={form.control} name="supplierId" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Supplier / Reference{" "}
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Smith Plumbing Ltd, INV-1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Receipt upload */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Receipt{" "}
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {receiptFile && (
                <p className="text-xs text-muted-foreground">{receiptFile.name}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
