import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getRegionsForCountry, type Country } from "@/lib/locale.ts";

const schema = z.object({
  name: z.string().min(1, "Property name is required"),
  type: z.enum(["residential", "commercial"]),
  country: z.enum(["nz", "au"]),
  address: z.string().min(1, "Address is required"),
  suburb: z.string().optional(),
  city: z.string().min(1, "City / town is required"),
  region: z.string().min(1, "Region / state is required"),
  postCode: z.string().min(4, "Post code is required"),
  totalUnits: z.coerce.number().int().min(1, "At least 1 unit"),
  status: z.enum(["active", "inactive"]),
  yearBuilt: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().or(z.literal("")),
  squareMetres: z.coerce.number().min(1).optional().or(z.literal("")),
  councilRef: z.string().optional(),
  titleNumber: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddPropertyDialog({ open, onClose }: Props) {
  const createProperty = useMutation(api.properties.create);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "residential",
      country: "nz",
      address: "",
      suburb: "",
      city: "",
      region: "",
      postCode: "",
      totalUnits: 1,
      status: "active",
      yearBuilt: "",
      squareMetres: "",
      councilRef: "",
      titleNumber: "",
      description: "",
    },
  });

  const selectedCountry = form.watch("country") as Country;
  const regions = getRegionsForCountry(selectedCountry);

  async function onSubmit(values: FormValues) {
    try {
      await createProperty({
        name: values.name,
        type: values.type,
        country: values.country,
        address: values.address,
        suburb: values.suburb || undefined,
        city: values.city,
        region: values.region,
        postCode: values.postCode,
        totalUnits: values.totalUnits,
        status: values.status,
        yearBuilt: values.yearBuilt ? Number(values.yearBuilt) : undefined,
        squareMetres: values.squareMetres ? Number(values.squareMetres) : undefined,
        councilRef: values.councilRef || undefined,
        titleNumber: values.titleNumber || undefined,
        description: values.description || undefined,
      });
      toast.success("Property added successfully");
      form.reset();
      onClose();
    } catch {
      toast.error("Failed to add property");
    }
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Country + Type */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => { field.onChange(v); form.setValue("region", ""); }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nz">🇳🇿 New Zealand</SelectItem>
                        <SelectItem value="au">🇦🇺 Australia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12 Queen Street Apartments" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12 Queen Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Suburb + City */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ponsonby" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City / Town</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Auckland" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Region + Postcode */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedCountry === "au" ? "State / Territory" : "Region"}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Code</FormLabel>
                    <FormControl>
                      <Input placeholder={selectedCountry === "au" ? "e.g. 2000" : "e.g. 1010"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Units + Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalUnits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Units</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Year Built + Square Metres */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearBuilt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Built <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 1995" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="squareMetres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Area m² <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 450" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Council Ref + Title Number */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="councilRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Council Reference <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. NA1234/567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Notes about this property..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add Property"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
