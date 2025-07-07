"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { GroceryForm } from '@/components/grocery-form';
import { useToast } from "@/hooks/use-toast";
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import { Card } from '@/components/ui/card';

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
    <div className="flex flex-col min-h-screen bg-primary">
      <AppHeader />
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="max-w-2xl mx-auto p-6 sm:p-8 shadow-xl">
            <GroceryForm
              onSubmitItems={handleFormSubmit}
              onClearList={handleClearList}
              isLoading={false}
              initialItems={itemsInput}
            />
          </Card>
        </div>
      </main>
    </div>
  );
}
