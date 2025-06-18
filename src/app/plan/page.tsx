
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CategorizedDisplay } from '@/components/categorized-display';
import { categorizeItems, type CategorizeItemsOutput, type CategorizeItemsInput } from '@/ai/flows/categorize-items';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, PlusCircle } from 'lucide-react';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

const getAllItemsFromCategorizedList = (list: CategorizeItemsOutput | null): string => {
  if (!list || !list.categorizedAisles) return '';
  return list.categorizedAisles.flatMap(aisle => aisle.items).join(', ');
};

export default function PlanPage() {
  const [categorizedList, setCategorizedList] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true); // For categorization & suggestions
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [suggestedItemsList, setSuggestedItemsList] = useState<string[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const performCategorization = useCallback(async (itemsToCategorize: string) => {
    setIsLoading(true);
    setCategorizedList(null); // Clear old list
    setSuggestedItemsList([]); // Clear old suggestions

    try {
      const inputForAI: CategorizeItemsInput = { items: itemsToCategorize };
      const result = await categorizeItems(inputForAI);
      
      if (result) {
        if (result.categorizedAisles && result.categorizedAisles.length === 0 && itemsToCategorize.trim() !== "") {
          toast({
            title: "No Categories Found",
            description: "The AI couldn't categorize the items. Try rephrasing or adding more specific items.",
            variant: "default",
          });
        }
        setCategorizedList(result);
        setSuggestedItemsList(result.suggestedItems || []);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST, JSON.stringify(result));
      } else {
        throw new Error("AI processing failed to return a result.");
      }
    } catch (error) {
      console.error("Error categorizing items and fetching suggestions:", error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: "Failed to process items and suggestions. Please try again.",
      });
      setCategorizedList({ categorizedAisles: [], suggestedItems: [] }); // Set to empty valid state
      setSuggestedItemsList([]);
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

    let listToSet: CategorizeItemsOutput | null = null;
    let categorizationNeeded = true;

    if (savedCategorizedList) {
      try {
        const parsedList = JSON.parse(savedCategorizedList) as CategorizeItemsOutput;
        const itemsFromParsedList = getAllItemsFromCategorizedList(parsedList).split(',').map(i => i.trim()).sort().join(',');
        const itemsFromInput = itemsInputFromStorage.split(',').map(i => i.trim()).sort().join(',');

        if (itemsFromParsedList === itemsFromInput) {
          listToSet = parsedList;
          setSuggestedItemsList(parsedList.suggestedItems || []); // Load suggestions from cache
          categorizationNeeded = false;
          setIsLoading(false); 
        }
      } catch (e) {
        console.error("Error parsing categorized list from localStorage on plan page, will re-categorize", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
      }
    }
    
    if (listToSet) {
        setCategorizedList(listToSet);
    }

    if (categorizationNeeded) {
      performCategorization(itemsInputFromStorage);
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
  }, [router, toast, performCategorization]);


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
      return newCheckedItems;
    });
  };
  
  const handleSelectSuggestion = useCallback(async (suggestedItem: string) => {
    const itemsInputFromStorage = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT) || "";
    const currentItemsArray = itemsInputFromStorage
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  
    if (currentItemsArray.map(item => item.toLowerCase()).includes(suggestedItem.trim().toLowerCase())) {
      toast({
        title: "Item Already Added",
        description: `"${suggestedItem}" is already in your list.`,
      });
      setSuggestedItemsList(prev => prev.filter(item => item.toLowerCase() !== suggestedItem.toLowerCase()));
      return;
    }
  
    const newItemsArray = [...currentItemsArray, suggestedItem.trim()];
    const newItemsString = newItemsArray.join(', ');
    
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT, newItemsString);
    
    // Optimistically remove from UI, re-categorization will fetch new suggestions
    setSuggestedItemsList(prev => prev.filter(item => item.toLowerCase() !== suggestedItem.toLowerCase())); 
  
    await performCategorization(newItemsString); 
  
  }, [performCategorization, toast]);


  const backButtonElement = (
    <Link href="/" passHref>
      <Button variant="outline" size="icon" className="shadow-sm hover:shadow-md transition-shadow">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  );

  if (isLoading && !categorizedList) { 
    return (
      <>
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center">
          <div className="my-6 self-start">
             {backButtonElement}
          </div>
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mt-8" />
          <p className="text-muted-foreground">Processing your items...</p>
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
        <CategorizedDisplay
          categorizedList={categorizedList}
          checkedItems={checkedItems}
          onItemToggle={handleItemToggle}
          displayMode="grid"
          backButton={backButtonElement}
        />

        {!isLoading && categorizedList && (categorizedList.categorizedAisles.length > 0 || suggestedItemsList.length > 0) && (
          <div className="mt-8 text-center">
            <div className="my-8 p-4 border border-dashed rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-left">Did you forget?</h3>
              {isLoading && suggestedItemsList.length === 0 ? ( // Show loader if main loading is true AND no suggestions yet
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : suggestedItemsList.length > 0 ? (
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  {suggestedItemsList.map((item, index) => (
                    <Badge 
                      key={`${item}-${index}`}
                      variant="outline" 
                      onClick={() => handleSelectSuggestion(item)} 
                      className="cursor-pointer hover:bg-accent/20 p-2 px-3 text-base rounded-full shadow-sm transition-all hover:shadow-md"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleSelectSuggestion(item) : null}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-left">No suggestions right now, or an error occurred.</p>
              )}
            </div>
             {/* Only show map button if there are actual items categorized */}
            {categorizedList && categorizedList.categorizedAisles.length > 0 && (
                <Link href="/map" passHref>
                <Button variant="secondary" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                    <MapPin className="mr-2 h-5 w-5" />
                    View Store Map & Checklist
                </Button>
                </Link>
            )}
          </div>
        )}
         
         {!isLoading && (!categorizedList || categorizedList.categorizedAisles.length === 0) && (
           <div className="mt-10 flex flex-col items-center justify-center text-center text-muted-foreground p-8 border border-dashed rounded-lg">
             <p>No items were categorized. Please check your input or try again.</p>
           </div>
         )}

      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear || new Date().getFullYear()} AislePilot. Happy Shopping!</p>
      </footer>
    </>
  );
}

