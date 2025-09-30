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
  async input => {
    const {output} = await sanitizeUserInputPrompt(input);
    return output!;
  }
);
