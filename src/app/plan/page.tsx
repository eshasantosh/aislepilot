
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    const itemsToCategorize = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (!itemsToCategorize || itemsToCategorize.trim() === "") {
      toast({
        title: "No items to categorize",
        description: "Please enter some items on the main page first.",
        variant: "default"
      });
      router.push('/');
      return;
    }

    const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    const savedItemQuantities = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);

    if (savedCategorizedList) {
      try {
        const parsedList = JSON.parse(savedCategorizedList);
        setCategorizedList(parsedList);
        setIsLoading(false);
      } catch (e) {
        console.error("Error parsing categorized list from localStorage on plan page", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
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

    if (savedItemQuantities) {
      try {
        setItemQuantities(JSON.parse(savedItemQuantities));
      } catch (e) {
        console.error("Error parsing item quantities from localStorage on plan page", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);
      }
    }
  }, [router, toast]);


  const performCategorization = useCallback(async (items: string) => {
    setIsLoading(true);
    setCategorizedList(null);

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
      setCategorizedList(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (categorizedList && !isLoading) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST, JSON.stringify(categorizedList));
    }
  }, [categorizedList, isLoading]);

  useEffect(() => {
    if (!isLoading) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
    }
  }, [checkedItems, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES, JSON.stringify(itemQuantities));
    }
  }, [itemQuantities, isLoading]);


  const handleItemToggle = (itemName: string, _aisleName: string) => {
    setCheckedItems((prevChecked) => {
      const isNowChecked = !prevChecked[itemName];
      const newCheckedItems = {
        ...prevChecked,
        [itemName]: isNowChecked,
      };

      if (isNowChecked) {
        setItemQuantities((prevQuantities) => {
          if (!prevQuantities[itemName] || prevQuantities[itemName] === 0) {
            return { ...prevQuantities, [itemName]: 1 };
          }
          return prevQuantities;
        });
      }
      // If unchecking, we don't remove from itemQuantities here,
      // it just won't be displayed in the cart.
      // Its quantity will be remembered if re-checked.
      return newCheckedItems;
    });
  };

  if (isLoading && !categorizedList) { // Check for categorizedList to avoid brief flash of loader if already loaded
    return (
      <>
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center">
          <AppHeader />
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mt-8" />
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
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <Link href="/" passHref>
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Item Input
            </Button>
          </Link>
        </div>

        <AppHeader />

        { (categorizedList && categorizedList.categorizedAisles && categorizedList.categorizedAisles.length > 0 ) ? (
            <Separator className="my-12" />
          ) : null
        }

        <CategorizedDisplay
          categorizedList={categorizedList}
          checkedItems={checkedItems}
          onItemToggle={handleItemToggle}
          displayMode="grid"
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
        <p>&copy; {currentYear || new Date().getFullYear()} AislePilot. Happy Shopping!</p>
      </footer>
    </>
  );
}
