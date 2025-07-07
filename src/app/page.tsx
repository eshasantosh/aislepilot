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
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const savedItemsInput = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS_INPUT);
    if (savedItemsInput) setItemsInput(savedItemsInput);
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
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS); // Clear added suggestions
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
            isLoading={false}
            initialItems={itemsInput}
          />
        </div>
        
      </main>
    </>
  );
}
