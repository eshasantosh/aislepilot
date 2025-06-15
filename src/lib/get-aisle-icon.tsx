import type { LucideIcon } from 'lucide-react';
import {
  Leaf, Carrot, Package, Snowflake, Coffee, Wine, SprayCan, Sparkles, ShoppingBasket, Tag,
  Utensils, Beef, Apple, Milk, CakeSlice, Bone, Fish, Shell, Wheat, GlassWater, Sandwich
} from 'lucide-react';

const aisleIconMap: Record<string, LucideIcon> = {
  produce: Leaf,
  vegetable: Carrot,
  fruit: Apple,
  dairy: Milk,
  milk: Milk,
  cheese: Milk, // Using Milk as general dairy icon
  yogurt: Milk, 
  bakery: CakeSlice,
  bread: Sandwich,
  pantry: Package,
  canned: Package,
  pasta: Utensils, // More specific than package
  cereal: Wheat,
  rice: Wheat,
  snacks: Package, // Could be more specific if needed
  frozen: Snowflake,
  beverage: Coffee,
  drink: Wine,
  juice: GlassWater,
  soda: GlassWater,
  water: GlassWater,
  cleaning: SprayCan,
  household: Sparkles,
  "personal care": Sparkles, // Using Sparkles as a generic "freshness" icon
  hygiene: Sparkles,
  meat: Beef,
  beef: Beef,
  pork: Bone, // General meat/bone
  poultry: Bone, // General meat/bone
  chicken: Bone,
  seafood: Fish,
  fish: Fish,
  shellfish: Shell,
  deli: Sandwich,
  condiment: Package, // Often bottled/packaged
  spices: Package, // Often packaged
  international: Tag, // Generic tag for international section
  organic: Leaf,
  default: ShoppingBasket,
};

export function getAisleIcon(aisleName: string): LucideIcon {
  const lowerCaseAisle = aisleName.toLowerCase();
  
  // Exact match first
  if (aisleIconMap[lowerCaseAisle]) {
    return aisleIconMap[lowerCaseAisle];
  }

  // Partial match
  for (const key in aisleIconMap) {
    if (key === 'default') continue; // Skip default for partial matching
    if (lowerCaseAisle.includes(key)) {
      return aisleIconMap[key];
    }
  }
  return aisleIconMap.default;
}
