
'use server';
/**
 * @fileOverview A grocery item categorization and suggestion AI agent.
 *
 * - categorizeItems - A function that handles the grocery item categorization and suggestion process.
 * - CategorizeItemsInput - The input type for the categorizeItems function.
 * - CategorizeItemsOutput - The return type for the categorizeItems function, including categorized aisles with user items and AI-suggested items.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeItemsInputSchema = z.object({
  items: z
    .string()
    .describe('A comma separated list of grocery items to categorize and get suggestions for.'),
});
export type CategorizeItemsInput = z.infer<typeof CategorizeItemsInputSchema>;

const ItemSchema = z.object({
  name: z.string().describe("The name of the grocery item."),
  isSuggestion: z.boolean().describe("True if this item is an AI suggestion, false if it was part of the user's original input.")
});

const AisleSchema = z.object({
  aisleName: z.string().describe("The name of the supermarket aisle."),
  items: z.array(ItemSchema).describe("A list of grocery items (user's and AI-suggested) found in this aisle.")
});

const CategorizeItemsOutputSchema = z.object({
  categorizedAisles: z.array(AisleSchema)
    .describe('A list of aisles, each containing a list of grocery items. Suggested items are included here, flagged with "isSuggestion: true".'),
}).describe('Contains a list of aisles with their categorized grocery items, including AI suggestions.');
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
2. Based on the provided items, suggest exactly 3 other related items that a user might have forgotten.
3. Include these 3 suggested items directly within the categorized aisles list, alongside the user's original items. Place each suggested item in an appropriate aisle.
4. For every item in the final list (both user's original items and your 3 suggested items), indicate if it's a suggestion by setting the 'isSuggestion' boolean flag. Set it to true for your suggestions, and false for items from the user's input.

Return a JSON object with one top-level key: "categorizedAisles".
Each element in the "categorizedAisles" array should be an object with:
- "aisleName" (string): The name of the supermarket aisle.
- "items" (array of objects): Each item object in this array must have:
    - "name" (string): The name of the grocery item.
    - "isSuggestion" (boolean): True if this item is one of your 3 suggestions, false if it was from the user's input.

Example input: "apples, milk"
Example output:
{
  "categorizedAisles": [
    {
      "aisleName": "Produce",
      "items": [
        { "name": "apples", "isSuggestion": false },
        { "name": "bananas", "isSuggestion": true }
      ]
    },
    {
      "aisleName": "Dairy",
      "items": [
        { "name": "milk", "isSuggestion": false },
        { "name": "yogurt", "isSuggestion": true }
      ]
    },
    {
      "aisleName": "Bakery",
      "items": [
        { "name": "bread", "isSuggestion": true }
      ]
    }
  ]
}

Example input for no items: ""
Example output for no items:
{
  "categorizedAisles": []
}

User's Items: {{{items}}}
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
    // Ensure categorizedAisles is an empty array if AI returns undefined or null for empty inputs.
    if (!output || !output.categorizedAisles) {
      return { categorizedAisles: [] };
    }
    return output;
  }
);
