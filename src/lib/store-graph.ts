/**
 * @fileoverview Defines the graph structure of the store.
 * This includes point definitions, coordinates, aisle associations, and edge costs.
 */

export type PointName = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';

interface Point {
  name: string;
  aisle?: string; // Not all points are named aisles
  coords: { lat: number; lng: number };
}

// Defines all the points in the store graph
export const points: Record<PointName, Point> = {
  A: { name: 'A', aisle: 'Garden', coords: { lat: 29.736264, lng: -95.511970 } },
  B: { name: 'B', coords: { lat: 29.736163, lng: -95.511943 } },
  C: { name: 'C', aisle: 'Hardware', coords: { lat: 29.736171, lng: -95.511492 } },
  D: { name: 'D', aisle: 'Entertainment', coords: { lat: 29.735719, lng: -95.511474 } },
  E: { name: 'E', aisle: 'Clothing', coords: { lat: 29.735671, lng: -95.511818 } },
  F: { name: 'F', aisle: 'Pet Care', coords: { lat: 29.735336, lng: -95.511380 } },
  G: { name: 'G', aisle: 'Grocery', coords: { lat: 29.734889, lng: -95.511374 } },
  H: { name: 'H', coords: { lat: 29.734849, lng: -95.511737 } },
  I: { name: 'I', aisle: 'Bakery', coords: { lat: 29.734829, lng: -95.512004 } },
  J: { name: 'J', aisle: 'Door/Checkout', coords: { lat: 29.735715, lng: -95.512066 } },
};

// Maps a user-friendly aisle name (from AI) to its corresponding point name in the graph
export const aisleToPointName: Record<string, PointName> = {
  garden: 'A',
  hardware: 'C',
  entertainment: 'D',
  clothing: 'E',
  'pet care': 'F',
  grocery: 'G',
  bakery: 'I',
  // Add other aisle names from your getAisleIcon that map to these points
  produce: 'A', // Assuming garden is produce
  deli: 'I', // Assuming bakery is deli
};

// Adjacency list representing the graph with edge costs
export const graph: Partial<Record<PointName, Partial<Record<PointName, number>>>> = {
  A: { B: 0 },
  B: { A: 0, C: 2, J: 1 },
  C: { B: 2, D: 2 },
  D: { C: 2, E: 1, F: 1 },
  E: { D: 1, H: 2 },
  F: { D: 1, G: 1 },
  G: { F: 1, H: 1 },
  H: { E: 2, G: 1, I: 1 },
  I: { H: 1, J: 2 },
  J: { B: 1, I: 2 },
};
