
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CategorizedDisplay } from '@/components/categorized-display';
import { categorizeItems, type CategorizeItemsOutput, type CategorizeItemsInput } from '@/ai/flows/categorize-items';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

// Helper to extract unique item names from the AI's categorized list for comparison
const getUniqueItemNamesFromAiOutput = (list: CategorizeItemsOutput | null): string => {
  if (!list || !list.categorizedAisles) return '';
  const allItems = list.categorizedAisles.flatMap(aisle => aisle.items.map(item => item.name.trim().toLowerCase()));
  return [...new Set(allItems)].sort().join(',');
};


export default function PlanPage() {
  const [categorizedListWithSuggestions, setCategorizedListWithSuggestions] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [userAddedSuggestions, setUserAddedSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const performCategorization = useCallback(async (itemsToCategorize: string) => {
    setIsLoading(true);
    setCategorizedListWithSuggestions(null); 

    try {
      const inputForAI: CategorizeItemsInput = { items: itemsToCategorize };
      const result = await categorizeItems(inputForAI);
      
      if (result && result.categorizedAisles) {
        if (result.categorizedAisles.length === 0 && itemsToCategorize.trim() !== "") {
          toast({
            title: "No Categories Found",
            description: "The AI couldn't categorize the items. Try rephrasing or adding more specific items.",
            variant: "default",
          });
        }
        setCategorizedListWithSuggestions(result);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST, JSON.stringify(result));
      } else {
        throw new Error("AI processing failed to return a valid result.");
      }
    } catch (error) {
      console.error("Error categorizing items:", error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: "Failed to process items. Please try again.",
      });
      setCategorizedListWithSuggestions({ categorizedAisles: [] }); 
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const itemsInputFromStorage = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (!itemsInputFromStorage || itemsInputFromStorage.trim() === "") {
      toast({
        title: "No items to process",
        description: "Please enter some items on the main page first.",
        variant: "default"
      });
      router.push('/');
      return;
    }

    const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    const savedItemQuantities = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);
    const savedUserAddedSuggestions = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS);

    let listToSet: CategorizeItemsOutput | null = null;
    let categorizationNeeded = true;

    if (savedCategorizedList) {
      try {
        const parsedList = JSON.parse(savedCategorizedList) as CategorizeItemsOutput;
        // Compare based on original user input to decide if re-categorization is needed
        const userItemsFromParsedList = parsedList.categorizedAisles
            .flatMap(aisle => aisle.items.filter(item => !item.isSuggestion))
            .map(item => item.name.trim().toLowerCase())
            .sort()
            .join(',');
        const currentInputItems = itemsInputFromStorage.split(',').map(i => i.trim().toLowerCase()).sort().join(',');

        if (userItemsFromParsedList === currentInputItems) {
          listToSet = parsedList;
          categorizationNeeded = false;
          setIsLoading(false); 
        }
      } catch (e) {
        console.error("Error parsing categorized list from localStorage on plan page, will re-categorize", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
      }
    }
    
    if (listToSet) {
        setCategorizedListWithSuggestions(listToSet);
    }

    if (categorizationNeeded) {
      performCategorization(itemsInputFromStorage);
    }

    if (savedCheckedItems) {
      try {
        setCheckedItems(JSON.parse(savedCheckedItems));
      } catch (e) { console.error("Error parsing checked items", e); localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS); }
    }

    if (savedItemQuantities) {
      try {
        setItemQuantities(JSON.parse(savedItemQuantities));
      } catch (e) { console.error("Error parsing item quantities", e); localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES); }
    }

    if (savedUserAddedSuggestions) {
        try {
            const parsedSuggestions = JSON.parse(savedUserAddedSuggestions);
            setUserAddedSuggestions(new Set(parsedSuggestions));
        } catch (e) { console.error("Error parsing added suggestions", e); localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS); }
    }

  }, [router, toast, performCategorization]);


  useEffect(() => {
    if (!isLoading) { // Only save when not initially loading
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
    }
  }, [checkedItems, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES, JSON.stringify(itemQuantities));
    }
  }, [itemQuantities, isLoading]);

  useEffect(() => {
    if(!isLoading) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS, JSON.stringify(Array.from(userAddedSuggestions)));
    }
  }, [userAddedSuggestions, isLoading]);


  const handleItemInteraction = useCallback((itemName: string, _aisleName: string, isInitialSuggestion: boolean) => {
    if (isInitialSuggestion && !userAddedSuggestions.has(itemName)) {
      // Adding a new suggestion
      setUserAddedSuggestions(prev => new Set(prev).add(itemName));
      setItemQuantities(prevQuantities => {
        if (!prevQuantities[itemName] || prevQuantities[itemName] === 0) {
          return { ...prevQuantities, [itemName]: 1 };
        }
        return prevQuantities;
      });
      // Optional: Automatically check the item when added? For now, no. Let user check it.
      // setCheckedItems(prev => ({...prev, [itemName]: true}));
      toast({
        title: "Item Added",
        description: `"${itemName}" has been added to your list.`,
      });
    } else {
      // Toggling an existing item (user's or already added suggestion)
      setCheckedItems(prevChecked => {
        const isNowChecked = !prevChecked[itemName];
        const newCheckedItems = {
          ...prevChecked,
          [itemName]: isNowChecked,
        };

        if (isNowChecked) {
          setItemQuantities(prevQuantities => {
            if (!prevQuantities[itemName] || prevQuantities[itemName] === 0) {
              return { ...prevQuantities, [itemName]: 1 };
            }
            return prevQuantities;
          });
        }
        return newCheckedItems;
      });
    }
  }, [userAddedSuggestions, toast]);
  

  const backButtonElement = (
    <Link href="/" passHref>
      <Button variant="outline" size="icon" className="shadow-sm hover:shadow-md transition-shadow">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  );

  if (isLoading && !categorizedListWithSuggestions) { 
    return (
      <>
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center">
          <div className="my-6 self-start">
             {backButtonElement}
          </div>
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mt-8" />
          <p className="text-muted-foreground">Organizing your grocery aisles & finding suggestions...</p>
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear || new Date().getFullYear()} AislePilot. Happy Shopping!</p>
        </footer>
      </>
    );
  }

  const hasActualContent = categorizedListWithSuggestions && categorizedListWithSuggestions.categorizedAisles.length > 0;

  return (
    <>
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <CategorizedDisplay
          categorizedList={categorizedListWithSuggestions}
          checkedItems={checkedItems}
          onItemInteraction={handleItemInteraction}
          userAddedSuggestions={userAddedSuggestions}
          displayMode="grid"
          backButton={backButtonElement}
        />

        {!isLoading && hasActualContent && (
          <div className="mt-8 text-center">
            <Link href="/map" passHref>
            <Button variant="secondary" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                <MapPin className="mr-2 h-5 w-5" />
                View Store Map & Checklist
            </Button>
            </Link>
          </div>
        )}
         
         {!isLoading && !hasActualContent && (
           <div className="mt-10 flex flex-col items-center justify-center text-center text-muted-foreground p-8 border border-dashed rounded-lg">
             <p>No items were categorized, or no suggestions found. Please check your input or try again.</p>
           </div>
         )}

      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear || new Date().getFullYear()} AislePilot. Happy Shopping!</p>
      </footer>
    </>
  );
}
