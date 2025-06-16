
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppHeader } from '@/components/app-header';
import { CategorizedDisplay } from '@/components/categorized-display';
import type { CategorizeItemsOutput } from '@/ai/flows/categorize-items';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Loader2, ScanLine, ShoppingCart, Plus, Minus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ITEM_PRICE_RS = 10;

export default function MapPage() {
  const [categorizedList, setCategorizedList] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    let listFromStorage: CategorizeItemsOutput | null = null;
    let checksFromStorage: Record<string, boolean> = {};
    let quantitiesFromStorage: Record<string, number> = {};

    try {
      const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
      if (savedCategorizedList) {
        try {
          listFromStorage = JSON.parse(savedCategorizedList);
        } catch (parseError) {
          console.error("Error parsing categorized list from localStorage on map page", parseError);
        }
      }

      const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
      if (savedCheckedItems) {
        try {
          checksFromStorage = JSON.parse(savedCheckedItems);
        } catch (parseError) {
          console.error("Error parsing checked items from localStorage on map page", parseError);
        }
      }
      
      const savedItemQuantities = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);
      if (savedItemQuantities) {
        try {
          quantitiesFromStorage = JSON.parse(savedItemQuantities);
        } catch (parseError) {
          console.error("Error parsing item quantities from localStorage on map page", parseError);
        }
      }

    } catch (storageAccessError) {
      console.error("Error accessing localStorage on map page (read operations):", storageAccessError);
    } finally {
      setCategorizedList(listFromStorage); // Set state after try-catch-finally structure
      setCheckedItems(checksFromStorage);
      setItemQuantities(quantitiesFromStorage);
      setIsLoading(false); // Ensure isLoading is set to false
    }
  }, []);

  useEffect(() => {
    if (!isLoading) { 
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
      } catch (storageAccessError) {
        console.error("Error saving checked items to localStorage on map page:", storageAccessError);
      }
    }
  }, [checkedItems, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES, JSON.stringify(itemQuantities));
      } catch (storageAccessError) {
        console.error("Error saving item quantities to localStorage on map page:", storageAccessError);
      }
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

  const handleIncreaseQuantity = (itemName: string) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemName]: (prev[itemName] || 0) + 1
    }));
  };

  const handleDecreaseQuantity = (itemName: string) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemName]: Math.max(1, (prev[itemName] || 1) - 1)
    }));
  };


  const getCompletedItems = () => {
    if (!categorizedList || !categorizedList.categorizedAisles) {
      return [];
    }
    const completed: string[] = [];
    categorizedList.categorizedAisles.forEach(aisle => {
      aisle.items.forEach(item => {
        if (checkedItems[item]) {
          completed.push(item);
        }
      });
    });
    return completed.sort();
  };

  const completedItems = getCompletedItems();

  const calculateTotalPrice = () => {
    return completedItems.reduce((total, item) => {
      const quantity = itemQuantities[item] || 0; 
      return total + (quantity * ITEM_PRICE_RS);
    }, 0);
  };


  if (isLoading && !categorizedList) {
    return (
      <>
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center">
          <div className="mb-6 w-full max-w-2xl mx-auto"> 
            <Link href="/plan" passHref>
              <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Grocery Plan
              </Button>
            </Link>
          </div>
          <AppHeader />
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mt-8" />
          <p className="text-muted-foreground">Loading map and checklist...</p>
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
          <Link href="/plan" passHref>
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Grocery Plan
            </Button>
          </Link>
        </div>
        
        <AppHeader />
        
        <div className="sticky top-0 z-20 bg-background pb-2 pt-1 shadow-md">
          <CategorizedDisplay
            categorizedList={categorizedList}
            checkedItems={checkedItems}
            onItemToggle={handleItemToggle}
            displayMode="carousel"
          />
        </div>
        
        <Separator className="my-8" />

        <section className="mb-8 p-4 sm:p-6 border bg-card rounded-lg shadow-lg">
          <h2 className="text-xl sm:text-2xl font-semibold font-headline mb-4 flex items-center">
            <MapPin className="mr-2 h-6 w-6 text-primary" />
            Store Layout
          </h2>
          <div className="bg-muted rounded-md overflow-hidden border">
            <Image
              src="https://placehold.co/800x600.png"
              alt="Store Map Placeholder"
              width={800}
              height={600}
              className="w-full h-auto object-contain"
              data-ai-hint="store layout supermarket plan"
              priority
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Placeholder store map. Actual layout may vary.</p>
          
          <div className="mt-6 text-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                  <ScanLine className="mr-2 h-5 w-5" />
                  Scan Barcode
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Barcode Scanner</DialogTitle>
                  <DialogDescription>
                    Point your camera at a barcode to scan it.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-center">
                  <p className="text-muted-foreground">
                    (Barcode scanning functionality coming soon!)
                  </p>
                  <div className="mt-4 flex justify-center">
                    <ScanLine className="h-24 w-24 text-primary/50" />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <Separator className="my-8" />

        <section className="mb-8 p-4 sm:p-6 border bg-card rounded-lg shadow-lg">
          <h2 className="text-xl sm:text-2xl font-semibold font-headline mb-4 flex items-center">
            <ShoppingCart className="mr-2 h-6 w-6 text-primary" />
            Shopping Cart
          </h2>
          {completedItems.length > 0 ? (
            <>
              <ul className="space-y-3">
                {completedItems.map(item => {
                  const quantity = itemQuantities[item] || 1;
                  const subtotal = quantity * ITEM_PRICE_RS;
                  return (
                    <li 
                      key={item} 
                      className="text-base p-3 bg-muted/60 rounded-md shadow-sm border border-input flex flex-col sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium flex-grow mb-2 sm:mb-0">{item}</span>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => handleDecreaseQuantity(item)}
                            disabled={quantity <= 1}
                            aria-label={`Decrease quantity of ${item}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center font-medium">{quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleIncreaseQuantity(item)}
                            aria-label={`Increase quantity of ${item}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground w-20 text-right">
                          Rs {subtotal.toFixed(2)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Separator className="my-6" />
              <div className="text-right">
                <p className="text-lg font-semibold">
                  Total: <span className="text-primary">Rs {calculateTotalPrice().toFixed(2)}</span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground italic">No items checked off yet. Start shopping!</p>
          )}
        </section>

      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear || new Date().getFullYear()} AislePilot. Happy Shopping!</p>
      </footer>
    </>
  );
}
