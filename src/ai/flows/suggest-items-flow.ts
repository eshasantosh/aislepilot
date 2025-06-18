'use server';
/**
 * @fileOverview An AI agent to suggest additional grocery items.
 *
 * - suggestMoreItems - A function that suggests items based on an existing list.
 * - SuggestMoreItemsInput - The input type for the suggestMoreItems function.
 * - SuggestMoreItemsOutput - The return type for the suggestMoreItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMoreItemsInputSchema = z.object({
  currentItems: z
    .string()
    .describe('A comma-separated list of current grocery items.'),
});
export type SuggestMoreItemsInput = z.infer<typeof SuggestMoreItemsInputSchema>;

const SuggestMoreItemsOutputSchema = z.object({
  suggestions: z.array(z.string()).length(3).describe('An array of exactly 3 suggested item names.'),
});
export type SuggestMoreItemsOutput = z.infer<typeof SuggestMoreItemsOutputSchema>;

export async function suggestMoreItems(input: SuggestMoreItemsInput): Promise<SuggestMoreItemsOutput> {
  return suggestMoreItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMoreItemsPrompt',
  input: {schema: SuggestMoreItemsInputSchema},
  output: {schema: SuggestMoreItemsOutputSchema},
  prompt: `You are a helpful shopping assistant.
Based on the following grocery items: {{{currentItems}}}
Suggest exactly 3 other related items that a user might have forgotten.
Return a JSON object with a single key "suggestions", which is an array of 3 strings.
Example input: "apples, bananas, milk"
Example output: {"suggestions": ["cereal", "orange juice", "bread"]}`,
});

const suggestMoreItemsFlow = ai.defineFlow(
  {
    name: 'suggestMoreItemsFlow',
    inputSchema: SuggestMoreItemsInputSchema,
    outputSchema: SuggestMoreItemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure the output is not null and conforms to the schema, though Genkit handles schema validation.
    // The prompt guides the LLM, but direct validation is by Genkit.
    // If output is null, it implies an issue with the LLM call or schema mismatch from LLM.
    if (!output) {
        // Fallback or error logging if needed.
        // For now, if LLM output is not parseable to schema or is null, an error will be thrown by Genkit.
        // We could return a default or throw a custom error.
        // Example: return { suggestions: ["default_item1", "default_item2", "default_item3"] };
        // For now, rely on Genkit's error handling.
    }
    return output!; // Assuming output is guaranteed by schema or Genkit handles errors.
  }
);
