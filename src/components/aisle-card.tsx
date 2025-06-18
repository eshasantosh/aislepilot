
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"; // For PlusCircle icon button
import { getAisleIcon } from "@/lib/get-aisle-icon";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { PlusCircle } from "lucide-react";

interface ItemDetail {
  name: string;
  isSuggestion: boolean;
}

interface AisleCardProps {
  aisleName: string;
  itemsInAisle: ItemDetail[];
  checkedItems: Record<string, boolean>;
  userAddedSuggestions: Set<string>;
  onItemInteraction: (itemName: string, aisleName: string, isInitialSuggestion: boolean) => void;
}

export function AisleCard({ aisleName, itemsInAisle, checkedItems, userAddedSuggestions, onItemInteraction }: AisleCardProps) {
  const Icon: LucideIcon = getAisleIcon(aisleName);

  // Sort items: user's items first, then suggestions. Within each group, sort alphabetically.
  const sortedItems = [...itemsInAisle].sort((a, b) => {
    // Prioritize non-suggestions or already added suggestions
    const aIsEffectivelyUserItem = !a.isSuggestion || userAddedSuggestions.has(a.name);
    const bIsEffectivelyUserItem = !b.isSuggestion || userAddedSuggestions.has(b.name);

    if (aIsEffectivelyUserItem && !bIsEffectivelyUserItem) return -1;
    if (!aIsEffectivelyUserItem && bIsEffectivelyUserItem) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center space-x-3 p-3">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          <CardTitle className="font-headline text-xl capitalize">{aisleName}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 flex-grow">
          <ul className="space-y-2">
            {sortedItems.map((item, index) => {
              const itemName = item.name;
              // An item is an "initial suggestion" if it's flagged as a suggestion AND not yet added by the user.
              const isInitialSuggestionDisplay = item.isSuggestion && !userAddedSuggestions.has(itemName);
              const itemID = `${aisleName}-${itemName.replace(/\s+/g, '-')}`; // Sanitize item name for ID

              return (
                <motion.li
                  key={itemID}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center space-x-3 p-1 rounded-md hover:bg-muted/50 transition-colors"
                >
                  {isInitialSuggestionDisplay ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-primary hover:text-primary/80"
                      onClick={() => onItemInteraction(itemName, aisleName, true)}
                      aria-label={`Add ${itemName} to list`}
                    >
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Checkbox
                      id={itemID}
                      checked={!!checkedItems[itemName]}
                      onCheckedChange={() => onItemInteraction(itemName, aisleName, false)}
                      aria-labelledby={`${itemID}-label`}
                    />
                  )}
                  <Label
                    htmlFor={isInitialSuggestionDisplay ? undefined : itemID} // Only link label if checkbox exists
                    id={`${itemID}-label`}
                    className={`text-base flex-1 ${
                      !isInitialSuggestionDisplay && checkedItems[itemName] ? "line-through text-muted-foreground" : ""
                    } ${isInitialSuggestionDisplay ? "cursor-default" : "cursor-pointer"}`}
                    onClick={isInitialSuggestionDisplay ? (e) => { 
                      e.preventDefault(); // Prevent any label click if it's a suggestion button
                      onItemInteraction(itemName, aisleName, true);
                    } : undefined}
                  >
                    {itemName}
                  </Label>
                </motion.li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
