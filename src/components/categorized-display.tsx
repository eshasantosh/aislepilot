"use client";

import type { CategorizeItemsOutput } from "@/ai/flows/categorize-items"; // Output now includes {name, isSuggestion}
import { AisleCard } from "./aisle-card";
import { PackageSearch } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { ReactNode } from 'react';

interface CategorizedDisplayProps {
  categorizedList: CategorizeItemsOutput | null; // Contains items with {name, isSuggestion}
  checkedItems: Record<string, boolean>;
  userAddedSuggestions: Set<string>; // To know which suggestions are "activated"
  onItemInteraction: (itemName: string, aisleName: string, isInitialSuggestion: boolean) => void; // Unified handler
  displayMode?: "carousel" | "grid";
  backButton?: ReactNode;
}

export function CategorizedDisplay({
  categorizedList,
  checkedItems,
  userAddedSuggestions,
  onItemInteraction,
  displayMode = "grid",
  backButton,
}: CategorizedDisplayProps) {

  if (!categorizedList || !categorizedList.categorizedAisles || categorizedList.categorizedAisles.length === 0) {
    return (
      <>
        <div className="relative flex items-center justify-center h-10 mb-4">
            {backButton && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                {backButton}
              </div>
            )}
            <h2 className="text-2xl font-semibold font-headline text-primary-foreground">
              AislePilot
            </h2>
        </div>
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border border-dashed rounded-lg">
          <PackageSearch className="h-16 w-16 mb-4" />
          <p className="text-xl font-medium">Your categorized list will appear here.</p>
          <p>Enter some items on the main page and click "Categorize Items" to get started!</p>
        </div>
      </>
    );
  }

  const sortedAisles = [...categorizedList.categorizedAisles].sort((a, b) =>
    a.aisleName.localeCompare(b.aisleName)
  );

  return (
    <div className={cn("space-y-4")}>
      <div className="relative flex items-center justify-center h-10">
        {backButton && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
            {backButton}
          </div>
        )}
        <h2 className="text-2xl font-semibold font-headline text-primary-foreground">
          AislePilot
        </h2>
      </div>

      {displayMode === "carousel" ? (
        <Carousel
          opts={{
            align: "start",
            loop: sortedAisles.length > 1,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-1">
            {sortedAisles.map(({ aisleName, items }, index) => (
              <CarouselItem key={`${aisleName}-${index}`} className="pl-1 basis-auto">
                <div className="p-1">
                  <AisleCard
                    aisleName={aisleName}
                    itemsInAisle={items} // items are {name, isSuggestion}
                    checkedItems={checkedItems}
                    userAddedSuggestions={userAddedSuggestions}
                    onItemInteraction={onItemInteraction}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {sortedAisles.length > 1 && (
            <>
              <CarouselPrevious className="hidden md:inline-flex" />
              <CarouselNext className="hidden md:inline-flex" />
            </>
          )}
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAisles.map(({ aisleName, items }, index) => (
            <AisleCard
              key={`${aisleName}-${index}-grid`}
              aisleName={aisleName}
              itemsInAisle={items} // items are {name, isSuggestion}
              checkedItems={checkedItems}
              userAddedSuggestions={userAddedSuggestions}
              onItemInteraction={onItemInteraction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
