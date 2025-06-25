"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { CategorizedDisplay } from '@/components/categorized-display';
import type { CategorizeItemsOutput, CategorizeItemsInput } from '@/ai/flows/categorize-items'; // CategorizeItemsInput might not be needed here
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ScanLine, Plus, Minus } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const ITEM_PRICE_RS = 10;

export default function MapPage() {
  const [displayListForMap, setDisplayListForMap] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [userAddedSuggestions, setUserAddedSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [_currentYear, setCurrentYear] = useState<number | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    let categorizedListFromAI: CategorizeItemsOutput | null = null;
    let checksFromStorage: Record<string, boolean> = {};
    let quantitiesFromStorage: Record<string, number> = {};
    let addedSuggestionsFromStorage: string[] = [];

    try {
      const savedCategorizedList = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIZED_LIST);
      if (savedCategorizedList) categorizedListFromAI = JSON.parse(savedCategorizedList);

      const savedCheckedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS);
      if (savedCheckedItems) checksFromStorage = JSON.parse(savedCheckedItems);
      
      const savedItemQuantities = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES);
      if (savedItemQuantities) quantitiesFromStorage = JSON.parse(savedItemQuantities);

      const savedUserAddedSuggestions = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ADDED_SUGGESTIONS);
      if (savedUserAddedSuggestions) addedSuggestionsFromStorage = JSON.parse(savedUserAddedSuggestions);

    } catch (storageAccessError) {
      console.error("Error accessing localStorage on map page:", storageAccessError);
      toast({ variant: "destructive", title: "Storage Error", description: "Could not load saved data." });
    }

    const localUserAddedSuggestions = new Set(addedSuggestionsFromStorage);
    setUserAddedSuggestions(localUserAddedSuggestions);

    if (categorizedListFromAI && categorizedListFromAI.categorizedAisles) {
      const processedListForMap: CategorizeItemsOutput = { categorizedAisles: [] };
      categorizedListFromAI.categorizedAisles.forEach(aisle => {
        const itemsForThisAisleOnMap = aisle.items.filter(item => {
          return !item.isSuggestion || localUserAddedSuggestions.has(item.name);
        });

        if (itemsForThisAisleOnMap.length > 0) {
          processedListForMap.categorizedAisles.push({
            aisleName: aisle.aisleName,
            items: itemsForThisAisleOnMap, // items still {name, isSuggestion} for AisleCard consistency
          });
        }
      });
      setDisplayListForMap(processedListForMap);
    } else {
      setDisplayListForMap({ categorizedAisles: [] });
    }
    
    setCheckedItems(checksFromStorage);
    setItemQuantities(quantitiesFromStorage);
    setIsLoading(false); 
  }, [toast]);

  // Persist checkedItems and itemQuantities (userAddedSuggestions is persisted on plan page)
  useEffect(() => {
    if (!isLoading) { 
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
      } catch (e) { console.error("Error saving checked items:", e); }
    }
  }, [checkedItems, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES, JSON.stringify(itemQuantities));
      } catch (e) { console.error("Error saving item quantities:", e); }
    }
  }, [itemQuantities, isLoading]);

  const requestCameraPermission = async () => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
      }
    } else {
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Camera Not Supported', description: 'Browser does not support camera.' });
    }
  };

  const handleItemInteractionOnMap = useCallback((itemName: string, _aisleName: string, _isInitialSuggestion: boolean) => {
    // On map page, all interactions are checkbox toggles
    setCheckedItems((prevChecked) => {
      const isNowChecked = !prevChecked[itemName];
      const newCheckedItems = { ...prevChecked, [itemName]: isNowChecked };
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
  }, []);


  const handleIncreaseQuantity = (itemName: string) => {
    setItemQuantities(prev => ({ ...prev, [itemName]: (prev[itemName] || 0) + 1 }));
  };

  const handleDecreaseQuantity = (itemName: string) => {
    setItemQuantities(prev => ({ ...prev, [itemName]: Math.max(1, (prev[itemName] || 1) - 1) }));
  };

  const getCompletedItemsForCart = () => {
    if (!displayListForMap || !displayListForMap.categorizedAisles) return [];
    const completed: string[] = [];
    displayListForMap.categorizedAisles.forEach(aisle => {
      aisle.items.forEach(item => { // item is {name, isSuggestion}
        if (checkedItems[item.name]) {
          completed.push(item.name);
        }
      });
    });
    return completed.sort();
  };

  const completedItemsInCart = getCompletedItemsForCart();

  const calculateTotalPrice = () => {
    return completedItemsInCart.reduce((total, itemName) => {
      const quantity = itemQuantities[itemName] || 0; 
      return total + (quantity * ITEM_PRICE_RS);
    }, 0);
  };

  const backButtonElement = (
    <Link href="/plan" passHref>
      <Button variant="outline" size="icon" className="shadow-sm hover:shadow-md transition-shadow">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  );

  if (isLoading && !displayListForMap) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mt-8" />
        <p className="text-muted-foreground">Loading map and checklist...</p>
      </main>
    );
  }

  return (
    <main className="relative flex-grow flex flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <iframe
            src="https://maps.google.com/maps?q=Walmart%2C%20Dunvale%2C%20Houston&output=embed"
            className="w-full h-full dark:invert-[1] dark:hue-rotate-[180deg] dark:filter dark:contrast-[0.9] dark:brightness-[0.9]"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Maps Route"
            data-ai-hint="city street map"
          ></iframe>
        </div>

        <div className="sticky top-0 z-20 py-2 px-4 md:px-6">
          <CategorizedDisplay
            categorizedList={displayListForMap} // Contains only items to be displayed on map
            checkedItems={checkedItems}
            onItemInteraction={handleItemInteractionOnMap} // All items here are effectively non-suggestions for interaction purposes
            userAddedSuggestions={userAddedSuggestions} // Pass this to correctly render items that were suggestions
            displayMode="carousel"
            backButton={backButtonElement}
          />
        </div>
        
        <div className="flex-grow"></div>

        <div className="sticky bottom-0 z-30 pt-4 px-4 md:px-6">
          <Card className="shadow-none border-0 sm:border bg-background/60 dark:bg-background/50 backdrop-blur-md border-border/30 shadow-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-row justify-between items-center gap-2">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Cart Total</p>
                    <p className="text-2xl font-semibold font-headline text-primary">
                      Rs {calculateTotalPrice().toFixed(2)}
                    </p>
                  </div>
                </div>
                <Dialog onOpenChange={(open) => { if (open) requestCameraPermission(); else if (videoRef.current && videoRef.current.srcObject) { const stream = videoRef.current.srcObject as MediaStream; stream.getTracks().forEach(track => track.stop()); videoRef.current.srcObject = null; setHasCameraPermission(null); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                      <ScanLine className="mr-2 h-4 w-4" />
                      Scan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-background/60 dark:bg-background/50 backdrop-blur-md border-border/30 shadow-xl">
                    <DialogHeader> <DialogTitle>Barcode Scanner</DialogTitle> <DialogDescription> Point camera at a barcode.</DialogDescription> </DialogHeader>
                    <div className="py-4">
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                      {hasCameraPermission === false && <Alert variant="destructive" className="mt-4"><AlertTitle>Camera Access Denied</AlertTitle><AlertDescription>Enable camera permissions.</AlertDescription></Alert>}
                      {hasCameraPermission === null && <p className="text-muted-foreground text-sm text-center mt-2">Requesting camera...</p>}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Separator className="my-2" />
              <Accordion type="single" collapsible className="w-full" defaultValue="cart-items">
                <AccordionItem value="cart-items" className="border-b-0">
                  <AccordionTrigger className="text-xl sm:text-2xl font-semibold font-headline hover:no-underline"> Shopping Cart Items </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    {completedItemsInCart.length > 0 ? (
                      <>
                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                          {completedItemsInCart.map(itemName => {
                            const quantity = itemQuantities[itemName] || 1;
                            const subtotal = quantity * ITEM_PRICE_RS;
                            return (
                              <li key={itemName} className="text-base p-3 bg-muted/60 rounded-md shadow-sm border border-input flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-medium flex-grow mb-2 sm:mb-0">{itemName}</span>
                                <div className="flex items-center justify-between sm:justify-end gap-2">
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDecreaseQuantity(itemName)} disabled={quantity <= 1} aria-label={`Decrease ${itemName}`}> <Minus className="h-4 w-4" /> </Button>
                                    <span className="w-6 text-center font-medium">{quantity}</span>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleIncreaseQuantity(itemName)} aria-label={`Increase ${itemName}`}> <Plus className="h-4 w-4" /> </Button>
                                  </div>
                                  <span className="text-sm text-muted-foreground w-20 text-right"> Rs {subtotal.toFixed(2)} </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <Separator className="my-6" />
                        <div className="text-right"> <p className="text-lg font-semibold"> Overall Total: <span className="text-primary">Rs {calculateTotalPrice().toFixed(2)}</span> </p> </div>
                      </>
                    ) : ( <p className="text-muted-foreground italic">No items checked off yet.</p> )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2 text-center pb-2">Map data © Google. Route for demonstration.</p>
        </div>
    </main>
  );
}
