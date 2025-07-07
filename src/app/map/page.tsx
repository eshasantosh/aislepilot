
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { GoogleMap, useJsApiLoader, Polyline, Marker, OverlayView } from '@react-google-maps/api';
import { CategorizedDisplay } from '@/components/categorized-display';
import type { CategorizeItemsOutput } from '@/ai/flows/categorize-items';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ScanLine, Plus, Minus, QrCode } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { findOptimalPath } from '@/lib/pathfinding';
import { aisleToPointName, points } from '@/lib/store-graph';
import type { PointName } from '@/lib/store-graph';
import { getItemPrice, availableItems, getItemAisle } from '@/lib/pricing';
import { ScrollArea } from '@/components/ui/scroll-area';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapCenter = {
  lat: 29.7355,
  lng: -95.5117,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  ],
};

export default function MapPage() {
  const [displayListForMap, setDisplayListForMap] = useState<CategorizeItemsOutput | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [userAddedSuggestions, setUserAddedSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Pathfinding states
  const [shoppingPath, setShoppingPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [pathSegments, setPathSegments] = useState<google.maps.LatLngLiteral[][]>([]);
  const [orderedAisles, setOrderedAisles] = useState<PointName[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  // Checkout and Scan state
  const [checkoutCode, setCheckoutCode] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedItem, setScannedItem] = useState<{ name: string; quantity: number } | null>(null);

  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
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
      const requiredAislesForPath = new Set<string>();

      categorizedListFromAI.categorizedAisles.forEach(aisle => {
        const itemsForThisAisleOnMap = aisle.items.filter(item => {
          return !item.isSuggestion || localUserAddedSuggestions.has(item.name);
        });

        if (itemsForThisAisleOnMap.length > 0) {
          processedListForMap.categorizedAisles.push({
            aisleName: aisle.aisleName,
            items: itemsForThisAisleOnMap,
          });
          requiredAislesForPath.add(aisle.aisleName);
        }
      });
      
      const requiredPoints = Array.from(requiredAislesForPath)
        .map(aisle => aisleToPointName[aisle.toLowerCase()])
        .filter(point => point);

      const uniquePoints = Array.from(new Set(requiredPoints));

      if (uniquePoints.length > 0) {
        const { pathCoords, visitOrder, pathSegmentsCoords } = findOptimalPath(uniquePoints);
        setShoppingPath(pathCoords);
        setPathSegments(pathSegmentsCoords);
        setOrderedAisles(visitOrder);
        
        // Sort the display list based on the optimal path
        const shoppingOrder = visitOrder.map(pointName => points[pointName].aisle).filter(Boolean);
        const sortedAisles = [...processedListForMap.categorizedAisles].sort((a, b) => {
          const aIndex = shoppingOrder.indexOf(a.aisleName);
          const bIndex = shoppingOrder.indexOf(b.aisleName);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        setDisplayListForMap({ categorizedAisles: sortedAisles });

      } else {
        setDisplayListForMap(processedListForMap); // Display empty or whatever was processed
        setShoppingPath([]);
      }

    } else {
      setDisplayListForMap({ categorizedAisles: [] });
    }
    
    setCheckedItems(checksFromStorage);
    setItemQuantities(quantitiesFromStorage);
    setIsLoading(false); 
  }, [toast]);

  // Effect to update the current path segment based on checked items
  useEffect(() => {
    if (!orderedAisles.length || !displayListForMap?.categorizedAisles.length) return;

    // The points to visit, excluding start/end. e.g., ['A', 'C']
    const pointsToVisit = orderedAisles.slice(1, -1); 

    let nextIncompletePointIndex = -1;

    for (let i = 0; i < pointsToVisit.length; i++) {
      const pointName = pointsToVisit[i];
      
      // Find all aisles in our list that map to this physical point
      const aislesForThisPoint = displayListForMap.categorizedAisles.filter(
        aisle => aisleToPointName[aisle.aisleName.toLowerCase()] === pointName
      );

      // Check if all items across all those aisles are checked
      const allItemsForPointChecked = aislesForThisPoint.every(aisle => 
        aisle.items.every(item => checkedItems[item.name])
      );

      if (!allItemsForPointChecked) {
        nextIncompletePointIndex = i;
        break;
      }
    }
    
    if (nextIncompletePointIndex === -1 && pointsToVisit.length > 0) {
      // All items are checked, highlight the last segment (path to checkout)
      setCurrentSegmentIndex(pathSegments.length - 1);
    } else if (nextIncompletePointIndex !== -1) {
      // Highlight the segment leading to the next incomplete point
      setCurrentSegmentIndex(nextIncompletePointIndex);
    }

  }, [checkedItems, orderedAisles, displayListForMap, pathSegments]);


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

  const handleScannerOpenChange = (open: boolean) => {
    setIsScannerOpen(open);
    if (open) {
      requestCameraPermission();
    } else if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setHasCameraPermission(null);
    }
  };

  const handleSimulateScan = () => {
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const randomItemName = availableItems[randomIndex];
    setScannedItem({ name: randomItemName, quantity: 1 });
    setIsScannerOpen(false); // Close scanner dialog
  };

  const handleScannedQuantityChange = (change: number) => {
    setScannedItem(prev => {
        if (!prev) return null;
        return { ...prev, quantity: Math.max(1, prev.quantity + change) };
    });
  };

  const handleConfirmScannedItem = () => {
    if (!scannedItem) return;
    const { name, quantity } = scannedItem;

    setDisplayListForMap(prevList => {
      if (!prevList) return { categorizedAisles: [] };

      const aisleName = getItemAisle(name);
      const newItem = { name, isSuggestion: false };

      const aisleIndex = prevList.categorizedAisles.findIndex(a => a.aisleName.toLowerCase() === aisleName.toLowerCase());

      let newAisles = [...prevList.categorizedAisles];

      if (aisleIndex > -1) {
          const targetAisle = newAisles[aisleIndex];
          const itemExists = targetAisle.items.some(item => item.name === newItem.name);
          if (!itemExists) {
              newAisles = newAisles.map((aisle, index) => 
                  index === aisleIndex 
                  ? { ...aisle, items: [...aisle.items, newItem] } 
                  : aisle
              );
          }
      } else {
          newAisles = [...newAisles, { aisleName: aisleName, items: [newItem] }];
      }

      return { categorizedAisles: newAisles };
    });

    setCheckedItems(prev => ({ ...prev, [name]: true }));
    setItemQuantities(prev => ({ ...prev, [name]: quantity }));
    
    toast({
      title: "Item Added to Cart",
      description: `${quantity}x "${name}" has been added to your cart.`,
    });

    setScannedItem(null);
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
    // Use a Set to avoid duplicates if an item (like a scanned one) exists in multiple aisle arrays
    const itemNames = new Set<string>();

    displayListForMap.categorizedAisles.forEach(aisle => {
      aisle.items.forEach(item => {
        if (checkedItems[item.name]) {
          itemNames.add(item.name);
        }
      });
    });
    return Array.from(itemNames).sort();
  };

  const completedItemsInCart = getCompletedItemsForCart();

  const calculateTotalPrice = () => {
    return completedItemsInCart.reduce((total, itemName) => {
      const quantity = itemQuantities[itemName] || 0; 
      const price = getItemPrice(itemName);
      return total + (quantity * price);
    }, 0);
  };
  
  const handleCheckoutOpen = (open: boolean) => {
    if (open) {
      // Generate a random 12-digit code for the barcode
      const randomCode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      setCheckoutCode(randomCode);
    }
  };

  const backButtonElement = (
    <Link href="/plan" passHref>
      <Button variant="outline" size="icon" className="shadow-sm hover:shadow-md transition-shadow">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  );
  
  const renderMap = () => {
    if (loadError) return <div className="w-full h-full flex items-center justify-center bg-destructive text-destructive-foreground">Error loading maps. Please check your API key.</div>;
    if (!isLoaded) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const highlightedSegment = pathSegments[currentSegmentIndex];
    const upcomingAislePointName = orderedAisles[currentSegmentIndex + 1];
    const markerPosition = upcomingAislePointName ? points[upcomingAislePointName].coords : null;
    const upcomingAisleInfo = upcomingAislePointName ? points[upcomingAislePointName] : null;


    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={18}
        options={mapOptions}
      >
        {shoppingPath.length > 0 && (
          <>
            {/* Base path */}
            <Polyline
              path={shoppingPath}
              options={{
                strokeColor: '#757575', // A muted color for the base path
                strokeOpacity: 0.6,
                strokeWeight: 6,
              }}
            />
            {/* Highlighted current segment */}
            {highlightedSegment && (
              <Polyline
                path={highlightedSegment}
                options={{
                  strokeColor: '#4285F4', // A bright, primary color
                  strokeOpacity: 0.9,
                  strokeWeight: 8,
                  zIndex: 1,
                }}
              />
            )}
            {/* Marker for the upcoming aisle */}
            {markerPosition && (
               <Marker position={markerPosition} />
            )}
            {/* Label for the upcoming aisle */}
            {markerPosition && upcomingAisleInfo?.aisle && (
              <OverlayView
                position={markerPosition}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={(width, height) => ({
                  x: -(width / 2),
                  y: -(height + 10), // Adjust this value to position the label correctly above the marker
                })}
              >
                <div className="bg-background p-2 rounded-lg shadow-lg border border-border w-28 text-center">
                  <p className="font-semibold text-primary text-sm break-words">
                    {upcomingAisleInfo.aisle}
                  </p>
                </div>
              </OverlayView>
            )}
          </>
        )}
      </GoogleMap>
    );
  };


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
          {renderMap()}
        </div>

        <div className="sticky top-0 z-20 py-2 px-4 md:px-6">
          <CategorizedDisplay
            categorizedList={displayListForMap}
            checkedItems={checkedItems}
            onItemInteraction={handleItemInteractionOnMap}
            userAddedSuggestions={userAddedSuggestions}
            displayMode="carousel"
            backButton={backButtonElement}
          />
        </div>
        
        <div className="flex-grow"></div>

        <div className="sticky bottom-0 z-30 pt-4 px-4 md:px-6 pb-4">
          <Card className="shadow-lg bg-card/95 backdrop-blur-sm border-border/30">
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
                <div className="flex items-center gap-2">
                  <Dialog open={isScannerOpen} onOpenChange={handleScannerOpenChange}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                        <ScanLine className="mr-2 h-4 w-4" />
                        Scan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-background/90 backdrop-blur-sm border-border/30 shadow-xl">
                      <DialogHeader> <DialogTitle>Barcode Scanner</DialogTitle> <DialogDescription> Point camera at a barcode.</DialogDescription> </DialogHeader>
                      <div className="py-4">
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                        {hasCameraPermission === false && <Alert variant="destructive" className="mt-4"><AlertTitle>Camera Access Denied</AlertTitle><AlertDescription>Enable camera permissions.</AlertDescription></Alert>}
                        {hasCameraPermission === null && <p className="text-muted-foreground text-sm text-center mt-2">Requesting camera...</p>}
                      </div>
                      <div className="mt-4 flex justify-center">
                        <Button onClick={handleSimulateScan}>
                            <QrCode className="mr-2 h-4 w-4" /> Simulate Scan
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog onOpenChange={handleCheckoutOpen}>
                    <DialogTrigger asChild>
                       <Button size="sm" className="shadow-sm hover:shadow-md transition-shadow bg-accent text-accent-foreground hover:bg-accent/90">
                         <QrCode className="mr-2 h-4 w-4" />
                         Checkout
                       </Button>
                     </DialogTrigger>
                     <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
                       <DialogHeader>
                         <DialogTitle>Self-Checkout</DialogTitle>
                         <DialogDescription>
                           Scan this barcode at any self-checkout counter to proceed with payment.
                         </DialogDescription>
                       </DialogHeader>
                       <div className="py-4 space-y-4">
                         {checkoutCode && (
                           <div className="w-full flex justify-center p-4 bg-white rounded-md">
                             <img
                               src={`https://barcode.tec-it.com/barcode.ashx?data=${checkoutCode}&code=Code128&translate-esc=on`}
                               alt="Checkout Barcode"
                               className="w-full max-w-xs"
                             />
                           </div>
                         )}
                         <Separator />
                         <div className="space-y-2">
                           <h3 className="text-lg font-medium text-card-foreground">Your Items</h3>
                           <ScrollArea className="h-40 w-full pr-4">
                             <ul className="space-y-2">
                               {completedItemsInCart.map(itemName => {
                                   const quantity = itemQuantities[itemName] || 1;
                                   const price = getItemPrice(itemName);
                                   const subtotal = quantity * price;
                                   return (
                                       <li key={itemName} className="flex justify-between items-center text-sm">
                                           <span className="font-medium">{itemName} (x{quantity})</span>
                                           <span className="text-muted-foreground">Rs {subtotal.toFixed(2)}</span>
                                       </li>
                                   );
                               })}
                               {completedItemsInCart.length === 0 && (
                                <li className="text-sm text-muted-foreground italic">Your cart is empty.</li>
                               )}
                             </ul>
                           </ScrollArea>
                         </div>
                         <Separator />
                         <div className="flex justify-between items-center text-xl font-bold">
                           <span className="text-primary">Total</span>
                           <span className="text-primary">Rs {calculateTotalPrice().toFixed(2)}</span>
                         </div>
                       </div>
                     </DialogContent>
                  </Dialog>
                </div>
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
                            const price = getItemPrice(itemName);
                            const subtotal = quantity * price;
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
        </div>

        {scannedItem && (
          <AlertDialog open={!!scannedItem} onOpenChange={() => setScannedItem(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Add "{scannedItem.name}" to Cart?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This item was detected by the scanner. Adjust the quantity and add it to your cart.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex items-center justify-center gap-4 py-4">
                       <Button variant="outline" size="icon" onClick={() => handleScannedQuantityChange(-1)} disabled={scannedItem.quantity <= 1} aria-label={`Decrease ${scannedItem.name}`}> <Minus className="h-4 w-4" /> </Button>
                       <span className="text-xl font-bold w-12 text-center">{scannedItem.quantity}</span>
                       <Button variant="outline" size="icon" onClick={() => handleScannedQuantityChange(1)} aria-label={`Increase ${scannedItem.name}`}> <Plus className="h-4 w-4" /> </Button>
                  </div>
                  <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setScannedItem(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmScannedItem}>Add to Cart</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        )}
    </main>
  );
}
