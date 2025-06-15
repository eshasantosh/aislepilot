"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getAisleIcon } from "@/lib/get-aisle-icon";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface AisleCardProps {
  aisleName: string;
  items: string[];
  checkedItems: Record<string, boolean>;
  onItemToggle: (itemName: string, aisleName: string) => void;
}

export function AisleCard({ aisleName, items, checkedItems, onItemToggle }: AisleCardProps) {
  const Icon: LucideIcon = getAisleIcon(aisleName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center space-x-3 pb-3">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          <CardTitle className="font-headline text-xl capitalize">{aisleName}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {items.sort().map((item, index) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center space-x-3 p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`${aisleName}-${item}`}
                  checked={!!checkedItems[item]}
                  onCheckedChange={(checked) => onItemToggle(item, aisleName)}
                  aria-labelledby={`${aisleName}-${item}-label`}
                />
                <Label
                  htmlFor={`${aisleName}-${item}`}
                  id={`${aisleName}-${item}-label`}
                  className={`text-base flex-1 cursor-pointer ${
                    checkedItems[item] ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item}
                </Label>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
