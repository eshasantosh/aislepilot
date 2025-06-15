"use client";

import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app-header';
import { GroceryForm } from '@/components/grocery-form';
import { CategorizedDisplay } from '@/components/categorized-display';
import { categorizeItems, type CategorizeItemsOutput, type CategorizeItemsInput } from '@/ai/flows/categorize-items';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

const LOCAL_STORAGE_KEYS = {
  ITEMS_INPUT: 'aisleAssist_itemsInput',
  CATEGORIZED_LIST: 'aisleAssist_categorizedList',
  CHECKED_ITEMS: 'aisleAssist_checkedItems',
};

export default function Home() {
  const [itemsInput, setItemsInput] = useState<string>('');
  const [categorizedList, setCategorizedList] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Load state from localStorage on initial mount
  useEffect(() => {
    const savedItemsInput = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (savedItemsInput) setItemsInput(savedItemsInput);

    const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    if (savedCategorizedList) setCategorizedList(JSON.parse(savedCategorizedList));
    
    const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    if (savedCheckedItems) setCheckedItems(JSON.parse(savedCheckedItems));
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT, itemsInput);
  }, [itemsInput]);

  useEffect(() => {
    if (categorizedList) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST, JSON.stringify(categorizedList));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    }
  }, [categorizedList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
  }, [checkedItems]);


  const handleCategorizeItems = async (items: string) => {
    setItemsInput(items); // Update input state from form
    setIsLoading(true);
    setCategorizedList(null); // Clear previous results
    // setCheckedItems({}); // Optionally clear checked items on new categorization

    try {
      const inputForAI: CategorizeItemsInput = { items };
      const result = await categorizeItems(inputForAI);
      if (result && result.aisleMap && Object.keys(result.aisleMap).length === 0 && items.trim() !== "") {
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
        
        { (categorizedList && categorizedList.aisleMap && Object.keys(categorizedList.aisleMap).length > 0 ) || itemsInput.trim() === "" ? (
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
        <p>&copy; {new Date().getFullYear()} AisleAssist. Happy Shopping!</p>
      </footer>
    </>
  );
}
