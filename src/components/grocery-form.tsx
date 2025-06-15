"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Trash2, ListPlus } from "lucide-react";

const grocerySchema = z.object({
  items: z.string().min(1, "Please enter at least one grocery item.").max(1000, "Input is too long."),
});

type GroceryFormValues = z.infer<typeof grocerySchema>;

interface GroceryFormProps {
  onSubmitItems: (items: string) => Promise<void>;
  onClearList: () => void;
  isLoading: boolean;
  initialItems: string;
}

export function GroceryForm({ onSubmitItems, onClearList, isLoading, initialItems }: GroceryFormProps) {
  const form = useForm<GroceryFormValues>({
    resolver: zodResolver(grocerySchema),
    defaultValues: {
      items: initialItems,
    },
  });

  const handleSubmit: SubmitHandler<GroceryFormValues> = async (data) => {
    await onSubmitItems(data.items);
  };
  
  const handleClear = () => {
    form.reset({ items: "" });
    onClearList();
  };

  // Update form if initialItems prop changes (e.g. cleared from parent)
  React.useEffect(() => {
    form.setValue("items", initialItems);
  }, [initialItems, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="items"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="grocery-items" className="text-lg">Enter Grocery Items</FormLabel>
              <FormControl>
                <Textarea
                  id="grocery-items"
                  placeholder="e.g., apples, milk, bread, chicken breast"
                  className="min-h-[120px] resize-none text-base"
                  aria-describedby="items-description"
                  {...field}
                />
              </FormControl>
              <p id="items-description" className="text-sm text-muted-foreground">
                Enter items separated by commas. Our AI will sort them into aisles for you!
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ListPlus className="mr-2 h-4 w-4" />
            )}
            Categorize Items
          </Button>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleClear} disabled={isLoading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear List
          </Button>
        </div>
      </form>
    </Form>
  );
}
