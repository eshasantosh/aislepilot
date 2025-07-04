/**
 * @fileoverview Implements pathfinding algorithms for the store map.
 * - Dijkstra's algorithm for shortest path between two nodes.
 * - A Traveling Salesperson Problem (TSP) solver for finding the optimal route.
 */

import { points, graph, PointName } from './store-graph';

// A simple Priority Queue implementation for Dijkstra's algorithm
class PriorityQueue {
  private elements: { key: PointName; priority: number }[];

  constructor() {
    this.elements = [];
  }

  enqueue(key: PointName, priority: number) {
    this.elements.push({ key, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): { key: PointName; priority: number } | undefined {
    return this.elements.shift();
  }

  isEmpty(): boolean {
    return this.elements.length === 0;
  }
}

/**
 * Calculates the shortest path between two points using Dijkstra's algorithm.
 * @param start The starting point name.
 * @param end The ending point name.
 * @returns An object containing the path as an array of point names and the total distance.
 */
function dijkstra(start: PointName, end: PointName): { path: PointName[]; distance: number } {
  const distances: Record<PointName, number> = {} as Record<PointName, number>;
  const previous: Record<PointName, PointName | null> = {} as Record<PointName, PointName | null>;
  const pq = new PriorityQueue();

  // Initialize distances
  for (const point in graph) {
    distances[point as PointName] = Infinity;
    previous[point as PointName] = null;
  }
  distances[start] = 0;
  pq.enqueue(start, 0);

  while (!pq.isEmpty()) {
    const { key: current } = pq.dequeue()!;

    if (current === end) {
      // Reconstruct path
      const path: PointName[] = [];
      let temp: PointName | null = end;
      while (temp) {
        path.unshift(temp);
        temp = previous[temp];
      }
      return { path, distance: distances[end] };
    }

    if (!graph[current]) continue;

    for (const neighbor in graph[current]) {
      const neighborName = neighbor as PointName;
      const cost = graph[current][neighborName];
      const newDist = distances[current] + cost;

      if (newDist < distances[neighborName]) {
        distances[neighborName] = newDist;
        previous[neighborName] = current;
        pq.enqueue(neighborName, newDist);
      }
    }
  }

  return { path: [], distance: Infinity }; // No path found
}

// Memoization cache for shortest path calculations
const shortestPathsCache: Record<string, { path: PointName[]; distance: number }> = {};

function getShortestPath(p1: PointName, p2: PointName): { path: PointName[]; distance: number } {
  const cacheKey1 = `${p1}-${p2}`;
  const cacheKey2 = `${p2}-${p1}`;

  if (shortestPathsCache[cacheKey1]) return shortestPathsCache[cacheKey1];
  if (shortestPathsCache[cacheKey2]) {
      const { path, distance } = shortestPathsCache[cacheKey2];
      // Return reversed path if queried in reverse
      return { path: [...path].reverse(), distance };
  }
  
  const result = dijkstra(p1, p2);
  shortestPathsCache[cacheKey1] = result;
  return result;
}


/**
 * Solves the Traveling Salesperson Problem for a given set of required points.
 * Finds the shortest possible route that visits each required point once,
 * starting and ending at 'J'.
 * @param requiredPoints An array of point names that must be visited.
 * @returns An object containing the full path as an array of point names, the total cost, and the coordinate path.
 */
export function findOptimalPath(requiredPoints: PointName[]): {
  path: PointName[];
  cost: number;
  pathCoords: { lat: number; lng: number }[];
} {
    const startPoint: PointName = 'J';

    // Ensure startPoint is not in the list of points to visit to avoid duplicates
    const pointsToVisit = requiredPoints.filter(p => p !== startPoint);

    if (pointsToVisit.length === 0) {
        // If the only required point is J or no points, stay at J.
        const pointJ = points[startPoint];
        return {
            path: [startPoint],
            cost: 0,
            pathCoords: [pointJ.coords],
        };
    }

    let minCost = Infinity;
    let bestPermutation: PointName[] = [];

    // --- Brute-force permutation for TSP ---
    // This is acceptable for a small number of aisles (n < 10)
    function generatePermutations(arr: PointName[]): PointName[][] {
        if (arr.length === 0) return [[]];
        const firstEl = arr[0];
        const rest = arr.slice(1);
        const permsWithoutFirst = generatePermutations(rest);
        const allPermutations: PointName[][] = [];

        permsWithoutFirst.forEach(perm => {
            for (let i = 0; i <= perm.length; i++) {
                const permWithFirst = [...perm.slice(0, i), firstEl, ...perm.slice(i)];
                allPermutations.push(permWithFirst);
            }
        });
        return allPermutations;
    }

    const permutations = generatePermutations(pointsToVisit);

    permutations.forEach(permutation => {
        let currentCost = 0;
        let lastPoint = startPoint;

        // Cost from Start (J) to the first point in permutation
        currentCost += getShortestPath(lastPoint, permutation[0]).distance;
        lastPoint = permutation[0];

        // Cost between points in the permutation
        for (let i = 0; i < permutation.length - 1; i++) {
            currentCost += getShortestPath(permutation[i], permutation[i + 1]).distance;
        }
        lastPoint = permutation[permutation.length - 1];

        // Cost from the last point in permutation back to Start (J)
        currentCost += getShortestPath(lastPoint, startPoint).distance;

        if (currentCost < minCost) {
            minCost = currentCost;
            bestPermutation = permutation;
        }
    });

    // --- Reconstruct the full path from the best permutation ---
    const finalPath: PointName[] = [];
    let lastPointInFullPath = startPoint;
    
    const fullVisitOrder = [startPoint, ...bestPermutation, startPoint];
    
    for (let i = 0; i < fullVisitOrder.length - 1; i++) {
        const from = fullVisitOrder[i];
        const to = fullVisitOrder[i+1];
        const segment = getShortestPath(from, to);
        // Add all points from the segment, but omit the first point if it's not the very start of the path
        finalPath.push(...(i === 0 ? segment.path : segment.path.slice(1)));
    }


    const pathCoords = finalPath.map(p => points[p].coords);

    return {
        path: finalPath,
        cost: minCost,
        pathCoords,
    };
}
