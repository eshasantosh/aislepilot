
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CategorizedDisplay } from '@/components/categorized-display';
import type { CategorizeItemsOutput } from '@/ai/flows/categorize-items';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ScanLine, Plus, Minus, CreditCard } from 'lucide-react';
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
  const [categorizedList, setCategorizedList] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

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
      toast({
        variant: "destructive",
        title: "Storage Error",
        description: "Could not load saved data. Your list might not persist.",
      });
    } finally {
      setCategorizedList(listFromStorage); 
      setCheckedItems(checksFromStorage);
      setItemQuantities(quantitiesFromStorage);
      setIsLoading(false); 
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoading) { 
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(checkedItems));
      } catch (storageAccessError) {
        console.error("Error saving checked items to localStorage on map page:", storageAccessError);
         toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save your checked items.",
          });
      }
    }
  }, [checkedItems, isLoading, toast]);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ITEM_QUANTITIES, JSON.stringify(itemQuantities));
      } catch (storageAccessError) {
        console.error("Error saving item quantities to localStorage on map page:", storageAccessError);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save item quantities.",
        });
      }
    }
  }, [itemQuantities, isLoading, toast]);

  const requestCameraPermission = async () => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use the scanner.',
        });
      }
    } else {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access for scanning.',
        });
    }
  };


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

  const backButtonElement = (
    <Link href="/plan" passHref>
      <Button variant="outline" size="icon" className="shadow-sm hover:shadow-md transition-shadow">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  );

  if (isLoading && !categorizedList) {
    return (
      <>
        <main className="flex-grow container mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mt-8" />
          <p className="text-muted-foreground">Loading map and checklist...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="flex-grow container mx-auto px-4 md:px-6 pt-8 pb-24">
        
        <div className="sticky top-0 z-20 py-2 shadow-md -mx-4 md:-mx-6 px-4 md:px-6">
          <CategorizedDisplay
            categorizedList={categorizedList}
            checkedItems={checkedItems}
            onItemToggle={handleItemToggle}
            displayMode="carousel"
            backButton={backButtonElement}
          />
        </div>
        
        <section className="my-8">
          <div className="bg-muted rounded-md overflow-hidden border">
            <Image
              src="https://placehold.co/800x800.png"
              alt="Store Map Placeholder"
              width={800}
              height={800}
              className="w-full h-auto object-contain"
              data-ai-hint="store layout supermarket plan"
              priority
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Placeholder store map. Actual layout may vary.</p>
        </section>

        <div className="sticky bottom-0 z-30 pt-4 -mx-4 md:-mx-6 px-4 md:px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-2px_rgba(0,0,0,0.1)]">
          <Card className="shadow-none border-0 sm:border sm:shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-row justify-between items-center gap-2">
                <div className="flex items-center">
                  <CreditCard className="mr-3 h-7 w-7 text-primary" />
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
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Barcode Scanner</DialogTitle>
                      <DialogDescription>
                        Point your camera at a barcode to scan it.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                      {hasCameraPermission === false && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertTitle>Camera Access Denied</AlertTitle>
                          <AlertDescription>
                            Please enable camera permissions in your browser settings to use the scanner. You might need to refresh the page after enabling.
                          </AlertDescription>
                        </Alert>
                      )}
                      {hasCameraPermission === null && <p className="text-muted-foreground text-sm text-center mt-2">Requesting camera access...</p>}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator className="my-4" />
              
              <Accordion type="single" collapsible className="w-full" defaultValue="cart-items">
                <AccordionItem value="cart-items" className="border-b-0">
                  <AccordionTrigger className="text-xl sm:text-2xl font-semibold font-headline hover:no-underline">
                    Shopping Cart Items
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {completedItems.length > 0 ? (
                      <>
                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
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
                            Overall Total: <span className="text-primary">Rs {calculateTotalPrice().toFixed(2)}</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">No items checked off yet. Start shopping!</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
        
      </main>
    </>
  );
}
    

    


