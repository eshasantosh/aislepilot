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
 * @returns An object containing the full path, cost, coordinates, visit order, and path segments.
 */
export function findOptimalPath(requiredPoints: PointName[]): {
  path: PointName[];
  cost: number;
  pathCoords: google.maps.LatLngLiteral[];
  visitOrder: PointName[];
  pathSegmentsCoords: google.maps.LatLngLiteral[][];
} {
    const startPoint: PointName = 'J';

    const pointsToVisit = requiredPoints.filter(p => p !== startPoint);

    if (pointsToVisit.length === 0) {
        const pointJ = points[startPoint];
        return {
            path: [startPoint],
            cost: 0,
            pathCoords: [pointJ.coords],
            visitOrder: [startPoint],
            pathSegmentsCoords: [],
        };
    }

    let minCost = Infinity;
    let bestPermutation: PointName[] = [];

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

        currentCost += getShortestPath(lastPoint, permutation[0]).distance;
        lastPoint = permutation[0];

        for (let i = 0; i < permutation.length - 1; i++) {
            currentCost += getShortestPath(permutation[i], permutation[i + 1]).distance;
        }
        lastPoint = permutation[permutation.length - 1];

        currentCost += getShortestPath(lastPoint, startPoint).distance;

        if (currentCost < minCost) {
            minCost = currentCost;
            bestPermutation = permutation;
        }
    });

    const finalPath: PointName[] = [];
    const pathSegments: PointName[][] = [];
    const visitOrder: PointName[] = [startPoint, ...bestPermutation, startPoint];
    
    for (let i = 0; i < visitOrder.length - 1; i++) {
        const from = visitOrder[i];
        const to = visitOrder[i+1];
        const segmentData = getShortestPath(from, to);
        const segmentPath = segmentData.path;
        
        pathSegments.push(segmentPath);
        finalPath.push(...(i === 0 ? segmentPath : segmentPath.slice(1)));
    }

    const pathCoords = finalPath.map(p => points[p].coords);
    const pathSegmentsCoords = pathSegments.map(segment => segment.map(p => points[p].coords));

    return {
        path: finalPath,
        cost: minCost,
        pathCoords,
        visitOrder: visitOrder,
        pathSegmentsCoords: pathSegmentsCoords,
    };
}
