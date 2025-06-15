
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppHeader } from '@/components/app-header';
import { CategorizedDisplay } from '@/components/categorized-display';
import type { CategorizeItemsOutput } from '@/ai/flows/categorize-items';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
// import { useToast } from "@/hooks/use-toast"; // Available if needed

export default function MapPage() {
  const [categorizedList, setCategorizedList] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  // const { toast } = useToast(); // Available if needed for notifications

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    if (savedCategorizedList) {
      try {
        setCategorizedList(JSON.parse(savedCategorizedList));
      } catch (e) {
        console.error("Error parsing categorized list from localStorage on map page", e);
        // Optionally inform user: toast({ variant: "destructive", title: "Error loading list" });
      }
    }
    
    const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    if (savedCheckedItems) {
      try {
        setCheckedItems(JSON.parse(savedCheckedItems));
      } catch (e) {
        console.error("Error parsing checked items from localStorage on map page", e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) { // Avoid writing to localStorage on initial mount if still loading
      localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
    }
  }, [checkedItems, isLoading]);

  const handleItemToggle = (itemName: string, _aisleName: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  if (isLoading && !categorizedList) { // Show loader only if data isn't ready yet
    return (
      <>
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading map and checklist...</p>
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear || new Date().getFullYear()} AisleAssist. Happy Shopping!</p>
        </footer>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <Link href="/plan" passHref>
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Grocery Plan
            </Button>
          </Link>
        </div>

        <section className="mb-8 p-4 sm:p-6 border bg-card rounded-lg shadow-lg">
          <h2 className="text-xl sm:text-2xl font-semibold font-headline mb-4 flex items-center">
            <MapPin className="mr-2 h-6 w-6 text-primary" />
            Store Layout
          </h2>
          <div className="bg-muted rounded-md overflow-hidden border">
            <Image
              src="https://placehold.co/800x600.png"
              alt="Store Map Placeholder"
              width={800}
              height={600}
              className="w-full h-auto object-contain"
              data-ai-hint="store layout supermarket plan"
              priority 
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Placeholder store map. Actual layout may vary.</p>
        </section>
        
        <Separator className="my-8" />

        <CategorizedDisplay
          categorizedList={categorizedList}
          checkedItems={checkedItems}
          onItemToggle={handleItemToggle}
        />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear || ''} AisleAssist. Happy Shopping!</p>
      </footer>
    </>
  );
}
