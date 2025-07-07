"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { GoogleMap, useJsApiLoader, Polyline, Marker, OverlayView } from '@react-google-maps/api';
import { CategorizedDisplay } from '@/components/categorized-display';
import type { CategorizeItemsOutput } from '@/ai/flows/categorize-items';
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
import { findOptimalPath } from '@/lib/pathfinding';
import { aisleToPointName, points } from '@/lib/store-graph';
import type { PointName } from '@/lib/store-graph';
import { getItemPrice } from '@/lib/pricing';

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
      const price = getItemPrice(itemName);
      return total + (quantity * price);
    }, 0);
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
                <div className="bg-background p-2 rounded-lg shadow-lg border border-border w-28">
                  <p className="font-semibold text-primary text-sm text-center">
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
          <Card className="shadow-lg">
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
                  <DialogContent className="sm:max-w-[425px] bg-background/90 backdrop-blur-sm border-border/30 shadow-xl">
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
    </main>
  );
}
