
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { GroceryForm } from '@/components/grocery-form';
import { CategorizedDisplay } from '@/components/categorized-display';
import { categorizeItems, type CategorizeItemsOutput, type CategorizeItemsInput } from '@/ai/flows/categorize-items';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

export default function Home() {
  const [itemsInput, setItemsInput] = useState<string>('');
  const [categorizedList, setCategorizedList] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    const savedItemsInput = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (savedItemsInput) setItemsInput(savedItemsInput);

    const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    if (savedCategorizedList) {
      try {
        setCategorizedList(JSON.parse(savedCategorizedList));
      } catch (e) {
        console.error("Error parsing categorized list from localStorage", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST); // Clear corrupted data
      }
    }
    
    const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    if (savedCheckedItems) {
      try {
        setCheckedItems(JSON.parse(savedCheckedItems));
      } catch (e) {
        console.error("Error parsing checked items from localStorage", e);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS); // Clear corrupted data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT, itemsInput);
  }, [itemsInput]);

  useEffect(() => {
    if (categorizedList) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST, JSON.stringify(categorizedList));
    } else {
      // Only remove if it was explicitly set to null, not on initial load
      // This check might need adjustment based on exact desired behavior on clear vs. initial
      if (localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST) && !isLoading) { 
         localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
      }
    }
  }, [categorizedList, isLoading]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
  }, [checkedItems]);


  const handleCategorizeItems = async (items: string) => {
    setItemsInput(items); 
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
  };

  const handleClearList = () => {
    setItemsInput('');
    setCategorizedList(null);
    setCheckedItems({});
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    toast({
      title: "List Cleared",
      description: "Your grocery list has been cleared.",
    });
  };

  const handleItemToggle = (itemName: string, _aisleName: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  return (
    <>
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <GroceryForm
            onSubmitItems={handleCategorizeItems}
            onClearList={handleClearList}
            isLoading={isLoading}
            initialItems={itemsInput}
          />
        </div>
        
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

        { (categorizedList && categorizedList.categorizedAisles && categorizedList.categorizedAisles.length > 0 ) || itemsInput.trim() === "" ? (
            <Separator className="my-12" />
          ) : null
        }

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
