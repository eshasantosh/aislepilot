

const itemDetails: Record<string, { price: number; aisle: string }> = {
  // Grocery
  "milk": { price: 60, aisle: "Grocery" },
  "cheese": { price: 90, aisle: "Grocery" },
  "eggs": { price: 45, aisle: "Grocery" },
  "butter": { price: 55, aisle: "Grocery" },
  "biscuit": { price: 25, aisle: "Grocery" },
  "chips": { price: 20, aisle: "Grocery" },
  "ketchup": { price: 85, aisle: "Grocery" },
  "onion": { price: 30, aisle: "Grocery" },
  "apple": { price: 40, aisle: "Grocery" },
  "soap": { price: 30, aisle: "Grocery" },
  "shampoo": { price: 120, aisle: "Grocery" },
  "toothpaste": { price: 55, aisle: "Grocery" },
  "mop": { price: 200, aisle: "Grocery" },
  "detergent": { price: 140, aisle: "Grocery" },
  
  // Bakery
  "bread": { price: 35, aisle: "Bakery" },
  
  // Clothing
  "towel": { price: 180, aisle: "Clothing" },
  "shoes": { price: 600, aisle: "Clothing" },

  // Hardware
  "hammer": { price: 250, aisle: "Hardware" },
  "nails": { price: 40, aisle: "Hardware" },
  "screws": { price: 50, aisle: "Hardware" },

  // Garden
  "soil": { price: 100, aisle: "Garden" },
  "fertiliser": { price: 150, aisle: "Garden" },
  "fertilizer": { price: 150, aisle: "Garden" },

  // Entertainment
  "dvd": { price: 120, aisle: "Entertainment" },
};

const DEFAULT_PRICE = 30;
const DEFAULT_AISLE = "Grocery";

export const availableItems = Object.keys(itemDetails);

export function getItemPrice(itemName: string): number {
  const normalizedItemName = itemName.trim().toLowerCase();
  return itemDetails[normalizedItemName]?.price ?? DEFAULT_PRICE;
}

export function getItemAisle(itemName: string): string {
  const normalizedItemName = itemName.trim().toLowerCase();
  return itemDetails[normalizedItemName]?.aisle ?? DEFAULT_AISLE;
}
