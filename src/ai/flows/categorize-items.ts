'use server';
/**
 * @fileOverview A grocery item categorization AI agent.
 *
 * - categorizeItems - A function that handles the grocery item categorization process.
 * - CategorizeItemsInput - The input type for the categorizeItems function.
 * - CategorizeItemsOutput - The return type for the categorizeItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeItemsInputSchema = z.object({
  items: z
    .string()
    .describe('A comma separated list of grocery items to categorize.'),
});
export type CategorizeItemsInput = z.infer<typeof CategorizeItemsInputSchema>;

const CategorizeItemsOutputSchema = z.object({
  aisleMap: z.record(z.string(), z.array(z.string()))
    .describe('A record where keys are supermarket aisles and values are arrays of grocery items in that aisle.')
}).describe('Contains the mapping of grocery items to their respective aisles. The main data is within the "aisleMap" property.');
export type CategorizeItemsOutput = z.infer<typeof CategorizeItemsOutputSchema>;

export async function categorizeItems(input: CategorizeItemsInput): Promise<CategorizeItemsOutput> {
  return categorizeItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeItemsPrompt',
  input: {schema: CategorizeItemsInputSchema},
  output: {schema: CategorizeItemsOutputSchema},
  prompt: `You are a grocery shopping expert. You will categorize a list of grocery items into supermarket aisles.

  Return a JSON object containing a single key, "aisleMap". The value of "aisleMap" should be an object where keys are supermarket aisles and values are arrays of grocery items belonging to that aisle.
  Example:
  {
    "aisleMap": {
      "Produce": ["apples", "bananas", "carrots"],
      "Dairy": ["milk", "cheese", "yogurt"]
    }
  }

  Items: {{{items}}}
  `,
});

const categorizeItemsFlow = ai.defineFlow(
  {
    name: 'categorizeItemsFlow',
    inputSchema: CategorizeItemsInputSchema,
    outputSchema: CategorizeItemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
