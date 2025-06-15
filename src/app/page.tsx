
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { GroceryForm } from '@/components/grocery-form';
import { useToast } from "@/hooks/use-toast";
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const [itemsInput, setItemsInput] = useState<string>('');
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    const savedItemsInput = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (savedItemsInput) setItemsInput(savedItemsInput);

    // Clear categorized list and checked items from local storage if user is back on the main input page
    // to ensure a fresh start for the /plan page unless they explicitly navigate back and forth.
    // This can be adjusted based on desired UX for persistence.
    // localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    // localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);


  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT, itemsInput);
  }, [itemsInput]);

  const handleFormSubmit = async (items: string) => {
    setItemsInput(items);
    // Ensure itemsInput is set in localStorage before navigating
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT, items);
    router.push('/plan');
  };

  const handleClearList = () => {
    setItemsInput('');
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST); // Also clear categorized list
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS); // and checked items
    toast({
      title: "List Cleared",
      description: "Your grocery list input has been cleared.",
    });
  };

  return (
    <>
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <GroceryForm
            onSubmitItems={handleFormSubmit}
            onClearList={handleClearList}
            isLoading={false} // isLoading is now managed on /plan page
            initialItems={itemsInput}
          />
        </div>
        
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear || ''} AisleAssist. Happy Shopping!</p>
      </footer>
    </>
  );
}
