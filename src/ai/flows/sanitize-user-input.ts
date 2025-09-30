'use server';

/**
 * @fileOverview This file defines a Genkit flow for sanitizing user input to prevent injection attacks.
 * It includes the SanitizeUserInput function, SanitizeUserInputInput type, and SanitizeUserInputOutput type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SanitizeUserInputInputSchema = z.object({
  userInput: z.string().describe('The user input to sanitize.'),
});
export type SanitizeUserInputInput = z.infer<typeof SanitizeUserInputInputSchema>;

const SanitizeUserInputOutputSchema = z.object({
  sanitizedInput: z.string().describe('The sanitized user input.'),
});
export type SanitizeUserInputOutput = z.infer<typeof SanitizeUserInputOutputSchema>;

export async function sanitizeUserInput(input: SanitizeUserInputInput): Promise<SanitizeUserInputOutput> {
  return sanitizeUserInputFlow(input);
}

const sanitizeUserInputPrompt = ai.definePrompt({
  name: 'sanitizeUserInputPrompt',
  input: {schema: SanitizeUserInputInputSchema},
  output: {schema: SanitizeUserInputOutputSchema},
  prompt: `You are an expert in preventing injection attacks. Sanitize the following user input to prevent any kind of injection attack, including but not limited to SQL injection, XSS, and command injection.  Return only the sanitized input.

User Input: {{{userInput}}}`,
});

const sanitizeUserInputFlow = ai.defineFlow(
  {
    name: 'sanitizeUserInputFlow',
    inputSchema: SanitizeUserInputInputSchema,
    outputSchema: SanitizeUserInputOutputSchema,
  },
  async (input, streamingCallback) => {
    const maxRetries = 3;
    let lastError: any = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const {output} = await sanitizeUserInputPrompt(input);
        return output!;
      } catch (e) {
        lastError = e;
        console.log(`Attempt ${i + 1} failed, retrying...`);
        // Wait for a short duration before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    // If all retries fail, throw the last captured error
    throw lastError;
  }
);
