// src/ai/flows/generate-game-over-message.ts
'use server';
/**
 * @fileOverview Generates a dramatic game over message in the style of an 80s action movie trailer.
 *
 * - generateGameOverMessage - A function that generates the game over message.
 * - GameOverMessageInput - The input type for the generateGameOverMessage function.
 * - GameOverMessageOutput - The return type for the generateGameOverMessage function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GameOverMessageInputSchema = z.object({
  score: z.number().describe('The player\s final score.'),
  survivalTime: z.number().describe('The player\s survival time in seconds.'),
});
export type GameOverMessageInput = z.infer<typeof GameOverMessageInputSchema>;

const GameOverMessageOutputSchema = z.object({
  message: z.string().describe('The AI-generated game over message.'),
});
export type GameOverMessageOutput = z.infer<typeof GameOverMessageOutputSchema>;

export async function generateGameOverMessage(
  input: GameOverMessageInput
): Promise<GameOverMessageOutput> {
  return generateGameOverMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gameOverMessagePrompt',
  input: {
    schema: z.object({
      score: z.number().describe('The player\s final score.'),
      survivalTime: z.number().describe('The player\s survival time in seconds.'),
    }),
  },
  output: {
    schema: z.object({
      message: z.string().describe('The AI-generated game over message.'),
    }),
  },
  prompt: `You are tasked with generating a dramatic game-over message in the style of an 80s action movie trailer.

  The player achieved a score of {{score}} and survived for {{survivalTime}} seconds.

  Craft a game-over message that is reminiscent of an 80s action movie trailer. The message must be thrilling, intense, and convey a sense of finality.
  `,
});

const generateGameOverMessageFlow = ai.defineFlow<
  typeof GameOverMessageInputSchema,
  typeof GameOverMessageOutputSchema
>(
  {
    name: 'generateGameOverMessageFlow',
    inputSchema: GameOverMessageInputSchema,
    outputSchema: GameOverMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
