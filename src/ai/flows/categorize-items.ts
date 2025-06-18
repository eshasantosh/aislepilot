
'use server';
/**
 * @fileOverview A grocery item categorization and suggestion AI agent.
 *
 * - categorizeItems - A function that handles the grocery item categorization and suggestion process.
 * - CategorizeItemsInput - The input type for the categorizeItems function.
 * - CategorizeItemsOutput - The return type for the categorizeItems function, including categorized aisles and suggested items.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeItemsInputSchema = z.object({
  items: z
    .string()
    .describe('A comma separated list of grocery items to categorize and get suggestions for.'),
});
export type CategorizeItemsInput = z.infer<typeof CategorizeItemsInputSchema>;

const CategorizedItemSchema = z.object({
  aisleName: z.string().describe("The name of the supermarket aisle."),
  items: z.array(z.string()).describe("A list of grocery items found in this aisle.")
});

const CategorizeItemsOutputSchema = z.object({
  categorizedAisles: z.array(CategorizedItemSchema)
    .describe('A list of aisles, each containing a list of grocery items belonging to that aisle.'),
  suggestedItems: z.array(z.string()).length(3).optional()
    .describe('An array of exactly 3 suggested item names, or an empty array if no suggestions can be made.'),
}).describe('Contains a list of aisles with their categorized grocery items and a list of suggested items. The main data is within the "categorizedAisles" and "suggestedItems" properties.');
export type CategorizeItemsOutput = z.infer<typeof CategorizeItemsOutputSchema>;


export async function categorizeItems(input: CategorizeItemsInput): Promise<CategorizeItemsOutput> {
  return categorizeItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeAndSuggestItemsPrompt',
  input: {schema: CategorizeItemsInputSchema},
  output: {schema: CategorizeItemsOutputSchema},
  prompt: `You are a grocery shopping expert.
1. Categorize the provided list of grocery items into supermarket aisles.
2. Based on the provided items, suggest exactly 3 other related items that a user might have forgotten. If no items are provided, or if you cannot make relevant suggestions, return an empty array for "suggestedItems".

Return a JSON object with two top-level keys:
- "categorizedAisles": An array of objects. Each object should have "aisleName" (string) and "items" (array of strings for that aisle).
- "suggestedItems": An array of 3 strings representing the suggested items, or an empty array.

Example input: "apples, milk"
Example output:
{
  "categorizedAisles": [
    { "aisleName": "Produce", "items": ["apples"] },
    { "aisleName": "Dairy", "items": ["milk"] }
  ],
  "suggestedItems": ["bananas", "cereal", "bread"]
}

Example input for no items: ""
Example output for no items:
{
  "categorizedAisles": [],
  "suggestedItems": []
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
    // Ensure suggestedItems is an empty array if undefined, to match schema expectations if AI omits it for empty inputs.
    if (output && output.suggestedItems === undefined) {
      output.suggestedItems = [];
    }
    return output!;
  }
);

