
"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAisleIcon } from "@/lib/get-aisle-icon";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { PlusCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  const sortedItems = [...itemsInAisle].sort((a, b) => {
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
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <Accordion type="single" collapsible className="w-full" defaultValue="aisle-content">
          <AccordionItem value="aisle-content" className="border-b-0">
            
            <AccordionTrigger className="w-full hover:no-underline p-3 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-t-lg data-[state=open]:rounded-b-none">
              <div className="flex items-center space-x-3">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <span className="font-headline text-xl capitalize text-card-foreground">{aisleName}</span> 
              </div>
            </AccordionTrigger>

            <AccordionContent className="p-3 pt-2 data-[state=closed]:pb-0">
              <ul className="space-y-2">
                {sortedItems.map((item, index) => {
                  const itemName = item.name;
                  const isInitialSuggestionDisplay = item.isSuggestion && !userAddedSuggestions.has(itemName);
                  const itemID = `${aisleName}-${itemName.replace(/\s+/g, '-')}`;

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
                          className="h-6 w-6 text-accent hover:text-accent/80"
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
                        htmlFor={isInitialSuggestionDisplay ? undefined : itemID}
                        id={`${itemID}-label`}
                        className={`text-base flex-1 ${
                          isInitialSuggestionDisplay
                            ? 'text-accent cursor-pointer'
                            : checkedItems[itemName]
                              ? 'line-through text-muted-foreground cursor-pointer'
                              : 'cursor-pointer'
                        }`}
                        onClick={isInitialSuggestionDisplay ? (e) => { 
                          e.preventDefault(); 
                          onItemInteraction(itemName, aisleName, true);
                        } : undefined}
                      >
                        {itemName}
                      </Label>
                    </motion.li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </motion.div>
  );
}
