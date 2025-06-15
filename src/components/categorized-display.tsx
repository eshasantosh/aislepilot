
"use client";

import type { CategorizeItemsOutput } from "@/ai/flows/categorize-items";
import { AisleCard } from "./aisle-card";
import { PackageSearch } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // Assuming this is where your Carousel components are

interface CategorizedDisplayProps {
  categorizedList: CategorizeItemsOutput | null;
  checkedItems: Record<string, boolean>;
  onItemToggle: (itemName: string, aisleName: string) => void;
}

export function CategorizedDisplay({ categorizedList, checkedItems, onItemToggle }: CategorizedDisplayProps) {
  if (!categorizedList || !categorizedList.categorizedAisles || categorizedList.categorizedAisles.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center text-center text-muted-foreground p-8 border border-dashed rounded-lg">
        <PackageSearch className="h-16 w-16 mb-4" />
        <p className="text-xl font-medium">Your categorized list will appear here.</p>
        <p>Enter some items on the main page and click "Categorize Items" to get started!</p>
      </div>
    );
  }

  const sortedAisles = [...categorizedList.categorizedAisles].sort((a, b) =>
    a.aisleName.localeCompare(b.aisleName)
  );

  return (
    <div className="mt-10 space-y-6">
      <h2 className="text-2xl font-semibold font-headline text-center">Your Grocery Plan</h2>
      <Carousel
        opts={{
          align: "start",
          loop: false, // Set to true if you want infinite looping
        }}
        className="w-full max-w-md mx-auto" // Adjust max-width as needed
      >
        <CarouselContent className="-ml-1">
          {sortedAisles.map(({ aisleName, items }, index) => (
            <CarouselItem key={index} className="pl-1 md:basis-1/1 lg:basis-1/1"> {/* Shows 1 card at a time */}
              <div className="p-1">
                <AisleCard
                  aisleName={aisleName}
                  items={items}
                  checkedItems={checkedItems}
                  onItemToggle={onItemToggle}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {sortedAisles.length > 1 && ( // Only show buttons if there's more than one item
          <>
            <CarouselPrevious className="hidden sm:flex" /> 
            <CarouselNext className="hidden sm:flex" />
          </>
        )}
      </Carousel>
    </div>
  );
}
