
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { CategorizedDisplay } from '@/components/categorized-display';
import { categorizeItems, type CategorizeItemsOutput, type CategorizeItemsInput } from '@/ai/flows/categorize-items';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

export default function PlanPage() {
  const [categorizedList, setCategorizedList] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    const itemsToCategorize = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (!itemsToCategorize || itemsToCategorize.trim() === "") {
      toast({
        title: "No items to categorize",
        description: "Please enter some items on the main page first.",
        variant: "default"
      });
      router.push('/'); // Redirect if no items
      return;
    }

    const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);

    if (savedCategorizedList) {
      try {
        // Check if the saved list corresponds to the current itemsInput
        // This is a simple check; more sophisticated logic might be needed if inputs can be very similar
        // For now, we assume if a categorized list exists, it's for the current input from localStorage
        const parsedList = JSON.parse(savedCategorizedList);
        setCategorizedList(parsedList);
        setIsLoading(false); // Already have a list, no need to call AI
      } catch (e) {
        console.error("Error parsing categorized list from localStorage on plan page", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
        // Proceed to categorize if parsing failed
        performCategorization(itemsToCategorize);
      }
    } else {
      performCategorization(itemsToCategorize);
    }
    
    if (savedCheckedItems) {
      try {
        setCheckedItems(JSON.parse(savedCheckedItems));
      } catch (e) {
        console.error("Error parsing checked items from localStorage on plan page", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
      }
    }
  }, [router, toast]);


  const performCategorization = async (items: string) => {
    setIsLoading(true);
    setCategorizedList(null); // Clear previous list before new categorization

    try {
      const inputForAI: CategorizeItemsInput = { items };
      const result = await categorizeItems(inputForAI);
      if (result && result.categorizedAisles && result.categorizedAisles.length === 0 && items.trim() !== "") {
        toast({
          title: "No Categories Found",
          description: "The AI couldn't categorize the items. Try rephrasing or adding more specific items.",
          variant: "default",
        });
      }
      setCategorizedList(result);
    } catch (error) {
      console.error("Error categorizing items:", error);
      toast({
        variant: "destructive",
        title: "Categorization Error",
        description: "Failed to categorize items. Please try again.",
      });
      setCategorizedList(null); // Ensure list is null on error
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Persist categorizedList to localStorage when it changes
    if (categorizedList && !isLoading) { // Avoid writing initial null or during loading
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST, JSON.stringify(categorizedList));
    }
  }, [categorizedList, isLoading]);

  useEffect(() => {
    // Persist checkedItems to localStorage
    if (!isLoading) { // Avoid writing if initial load is still happening
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
    }
  }, [checkedItems, isLoading]);


  const handleItemToggle = (itemName: string, _aisleName: string) => {
    setCheckedItems((prev) => {
      const newCheckedItems = {
        ...prev,
        [itemName]: !prev[itemName],
      };
      return newCheckedItems;
    });
  };

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Categorizing your items...</p>
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear || new Date().getFullYear()} AislePilot. Happy Shopping!</p>
        </footer>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <Link href="/" passHref>
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Item Input
            </Button>
          </Link>
        </div>
        
        { (categorizedList && categorizedList.categorizedAisles && categorizedList.categorizedAisles.length > 0 ) ? (
            <Separator className="my-12" />
          ) : null
        }

        <CategorizedDisplay
          categorizedList={categorizedList}
          checkedItems={checkedItems}
          onItemToggle={handleItemToggle}
        />

        {categorizedList && categorizedList.categorizedAisles && categorizedList.categorizedAisles.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/map" passHref>
              <Button variant="secondary" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                <MapPin className="mr-2 h-5 w-5" />
                View Store Map & Checklist
              </Button>
            </Link>
          </div>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear || ''} AislePilot. Happy Shopping!</p>
      </footer>
    </>
  );
}
