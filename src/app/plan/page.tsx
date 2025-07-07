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


export default function PlanPage() {
  const [categorizedListWithSuggestions, setCategorizedListWithSuggestions] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [userAddedSuggestions, setUserAddedSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const router = useRouter();

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

    const savedCategorizedListJSON = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    const savedCheckedItemsJSON = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    const savedItemQuantitiesJSON = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);
    const savedUserAddedSuggestionsJSON = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS);

    let needsFreshCategorization = true;
    let parsedListForCache: CategorizeItemsOutput | null = null;

    if (savedCategorizedListJSON) {
      try {
        const parsedList = JSON.parse(savedCategorizedListJSON) as CategorizeItemsOutput;
        // Basic validation for parsedList structure
        if (parsedList && Array.isArray(parsedList.categorizedAisles)) {
          const userItemsFromParsedList = parsedList.categorizedAisles
            .flatMap(aisle => aisle.items?.filter(item => item && !item.isSuggestion && typeof item.name === 'string') || []) // Ensure item and item.name are valid
            .map(item => item.name.trim().toLowerCase())
            .sort()
            .join(',');
          const currentInputItems = itemsInputFromStorage.split(',')
            .map(i => i.trim().toLowerCase())
            .filter(Boolean) // Remove empty strings that might result from trailing commas
            .sort()
            .join(',');

          if (userItemsFromParsedList === currentInputItems) {
            needsFreshCategorization = false;
            parsedListForCache = parsedList;
          }
        } else {
           localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST); // Invalid structure
        }
      } catch (e) {
        console.error("Error parsing categorized list from localStorage on plan page, will re-categorize", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
      }
    }
    
    if (needsFreshCategorization) {
      // If base list changed or cache is invalid, clear suggestions from any *previous* list.
      setUserAddedSuggestions(new Set());
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS);
      performCategorization(itemsInputFromStorage);
    } else if (parsedListForCache) {
      // Using cached list for the SAME user input. Load related states.
      setCategorizedListWithSuggestions(parsedListForCache);
      if (savedUserAddedSuggestionsJSON) {
        try {
          const parsedSuggestions = JSON.parse(savedUserAddedSuggestionsJSON);
          setUserAddedSuggestions(new Set(parsedSuggestions));
        } catch (e) { 
          console.error("Error parsing added suggestions", e); 
          localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS); 
        }
      }
      setIsLoading(false); // Using cache, so AI call is skipped
    }

    // Load checked items and quantities. Stale entries for items no longer in the list won't cause issues.
    if (savedCheckedItemsJSON) {
      try {
        setCheckedItems(JSON.parse(savedCheckedItemsJSON));
      } catch (e) { console.error("Error parsing checked items", e); localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS); }
    }
    if (savedItemQuantitiesJSON) {
      try {
        setItemQuantities(JSON.parse(savedItemQuantitiesJSON));
      } catch (e) { console.error("Error parsing item quantities", e); localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES); }
    }

  }, [router, toast, performCategorization]);


  useEffect(() => {
    // Save checkedItems, itemQuantities, and userAddedSuggestions when they change,
    // but only if not in the initial loading phase for the main list.
    if (!isLoading) { 
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
    }
  }, [checkedItems, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES, JSON.stringify(itemQuantities));
    }
  }, [itemQuantities, isLoading]);

  useEffect(() => {
    if(!isLoading) { // Also ensure not loading for suggestions when saving
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS, JSON.stringify(Array.from(userAddedSuggestions)));
    }
  }, [userAddedSuggestions, isLoading]);


  const handleItemInteraction = useCallback((itemName: string, _aisleName: string, isInitialSuggestion: boolean) => {
    if (isInitialSuggestion && !userAddedSuggestions.has(itemName)) {
      // Adding a new suggestion (clicked the PLUS icon)
      setUserAddedSuggestions(prev => {
        const newSet = new Set(prev); // Create new Set for immutable update
        newSet.add(itemName);
        return newSet;
      });
      setItemQuantities(prevQuantities => {
        // Set quantity to 1 if not already set or 0
        if (!prevQuantities[itemName] || prevQuantities[itemName] === 0) {
          return { ...prevQuantities, [itemName]: 1 };
        }
        return prevQuantities;
      });
      toast({
        title: "Item Added",
        description: `"${itemName}" has been added to your list.`,
      });
    } else {
      // Toggling an existing item's checkbox (user's original item or an already-added suggestion)
      setCheckedItems(prevChecked => {
        const isNowChecked = !prevChecked[itemName];
        const newCheckedItems = {
          ...prevChecked,
          [itemName]: isNowChecked,
        };

        if (isNowChecked) { // If item is being checked
          setItemQuantities(prevQuantities => {
            // Set quantity to 1 if not already set or 0
            if (!prevQuantities[itemName] || prevQuantities[itemName] === 0) {
              return { ...prevQuantities, [itemName]: 1 };
            }
            return prevQuantities;
          });
        }
        // If item is being unchecked, quantity remains as is.
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
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center bg-primary">
        <div className="my-6 self-start">
             {/* This is removed as backButton is now part of CategorizedDisplay header */}
        </div>
        <Loader2 className="h-12 w-12 animate-spin text-primary-foreground mb-4 mt-8" />
        <p className="text-primary-foreground">Organizing your grocery aisles & finding suggestions...</p>
      </main>
    );
  }

  const hasActualContent = categorizedListWithSuggestions && categorizedListWithSuggestions.categorizedAisles.length > 0;

  return (
    <main className="flex-grow container mx-auto px-4 md:px-6 py-8 bg-primary">
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
          <div className="flex flex-col items-center justify-center text-center text-primary-foreground p-8 border border-primary-foreground border-dashed rounded-lg">
            <p>No items were categorized, or no suggestions found. Please check your input or try again.</p>
          </div>
        )}

    </main>
  );
}
