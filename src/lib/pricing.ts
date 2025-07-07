
const itemPrices: Record<string, number> = {
  // Grocery
  "milk": 60,
  "bread": 35,
  "cheese": 90,
  "eggs": 45,
  "butter": 55,
  "biscuit": 25,
  "chips": 20,
  "ketchup": 85,
  "onion": 30,
  "apple": 40,

  // Household
  "soap": 30,
  "shampoo": 120,
  "toothpaste": 55,
  "mop": 200,
  "detergent": 140,
  "towel": 180,

  // Hardware
  "hammer": 250,
  "nails": 40,
  "screws": 50,

  // Garden
  "soil": 100,
  "fertiliser": 150,
  "fertilizer": 150, // Common alternate spelling

  // Entertainment
  "dvd": 120,

  // Clothing
  "shoes": 600,
};

const DEFAULT_PRICE = 30;

export function getItemPrice(itemName: string): number {
  const normalizedItemName = itemName.trim().toLowerCase();
  return itemPrices[normalizedItemName] ?? DEFAULT_PRICE;
}
