"use client";

import type { CategorizeItemsOutput } from "@/ai/flows/categorize-items";
import { AisleCard } from "./aisle-card";
import { AnimatePresence, motion } from "framer-motion";
import { PackageSearch } from "lucide-react";

interface CategorizedDisplayProps {
  categorizedList: CategorizeItemsOutput | null;
  checkedItems: Record<string, boolean>;
  onItemToggle: (itemName: string, aisleName: string) => void;
}

export function CategorizedDisplay({ categorizedList, checkedItems, onItemToggle }: CategorizedDisplayProps) {
  if (!categorizedList || !categorizedList.aisleMap || Object.keys(categorizedList.aisleMap).length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center text-center text-muted-foreground p-8 border border-dashed rounded-lg">
        <PackageSearch className="h-16 w-16 mb-4" />
        <p className="text-xl font-medium">Your categorized list will appear here.</p>
        <p>Enter some items above and click "Categorize Items" to get started!</p>
      </div>
    );
  }

  const sortedAisles = Object.entries(categorizedList.aisleMap).sort(([aisleA], [aisleB]) =>
    aisleA.localeCompare(aisleB)
  );

  return (
    <div className="mt-10 space-y-6">
      <h2 className="text-2xl font-semibold font-headline text-center">Your Grocery Plan</h2>
      <AnimatePresence>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {sortedAisles.map(([aisleName, items]) => (
            <AisleCard
              key={aisleName}
              aisleName={aisleName}
              items={items}
              checkedItems={checkedItems}
              onItemToggle={onItemToggle}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
