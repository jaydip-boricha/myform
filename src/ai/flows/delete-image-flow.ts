'use server';

/**
 * @fileOverview This file defines a Genkit flow for securely deleting an image from Cloudinary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v2 as cloudinary } from 'cloudinary';

const DeleteImageInputSchema = z.object({
  publicId: z.string().describe('The public ID of the image to delete from Cloudinary.'),
});
export type DeleteImageInput = z.infer<typeof DeleteImageInputSchema>;

const DeleteImageOutputSchema = z.object({
  result: z.string().describe('The result of the deletion operation.'),
});
export type DeleteImageOutput = z.infer<typeof DeleteImageOutputSchema>;

// This function is exported and called by the client-side code.
export async function deleteImage(input: DeleteImageInput): Promise<DeleteImageOutput> {
  return deleteImageFlow(input);
}

const deleteImageFlow = ai.defineFlow(
  {
    name: 'deleteImageFlow',
    inputSchema: DeleteImageInputSchema,
    outputSchema: DeleteImageOutputSchema,
  },
  async (input) => {
    // Configure Cloudinary with credentials from environment variables
    // These are server-side environment variables, not exposed to the client
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    try {
      const result = await cloudinary.uploader.destroy(input.publicId);
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Cloudinary deletion failed: ${result.result}`);
      }
      return { result: result.result };
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Re-throw the error to be caught by the client-side try/catch block
      throw new Error('Failed to delete image from Cloudinary.');
    }
  }
);

    