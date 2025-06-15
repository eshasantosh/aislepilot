
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

const CategorizedItemSchema = z.object({
  aisleName: z.string().describe("The name of the supermarket aisle."),
  items: z.array(z.string()).describe("A list of grocery items found in this aisle.")
});

const CategorizeItemsOutputSchema = z.object({
  categorizedAisles: z.array(CategorizedItemSchema)
    .describe('A list of aisles, each containing a list of grocery items belonging to that aisle.')
}).describe('Contains a list of aisles with their categorized grocery items. The main data is within the "categorizedAisles" property.');
export type CategorizeItemsOutput = z.infer<typeof CategorizeItemsOutputSchema>;


export async function categorizeItems(input: CategorizeItemsInput): Promise<CategorizeItemsOutput> {
  return categorizeItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeItemsPrompt',
  input: {schema: CategorizeItemsInputSchema},
  output: {schema: CategorizeItemsOutputSchema},
  prompt: `You are a grocery shopping expert. You will categorize a list of grocery items into supermarket aisles.

  Return a JSON object containing a single key, "categorizedAisles".
  The value of "categorizedAisles" should be an array of objects.
  Each object in the array should have two keys: "aisleName" (a string indicating the supermarket aisle) and "items" (an array of strings, where each string is a grocery item belonging to that aisle).

  Example:
  {
    "categorizedAisles": [
      { "aisleName": "Produce", "items": ["apples", "bananas", "carrots"] },
      { "aisleName": "Dairy", "items": ["milk", "cheese", "yogurt"] }
    ]
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
