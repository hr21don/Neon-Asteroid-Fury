'use server';

/**
 * @fileOverview Generates a victory message for the game.
 *
 * - generateVictoryMessage - A function that generates a victory message.
 * - VictoryMessageInput - The input type for the generateVictoryMessage function.
 * - VictoryMessageOutput - The return type for the generateVictoryMessage function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const VictoryMessageInputSchema = z.object({
  playerName: z.string().describe('The name of the player.'),
  score: z.number().describe('The final score of the player.'),
  time: z.string().describe('The time survived in the game.'),
});
export type VictoryMessageInput = z.infer<typeof VictoryMessageInputSchema>;

const VictoryMessageOutputSchema = z.object({
  message: z.string().describe('The AI-generated victory message.'),
});
export type VictoryMessageOutput = z.infer<typeof VictoryMessageOutputSchema>;

export async function generateVictoryMessage(input: VictoryMessageInput): Promise<VictoryMessageOutput> {
  return generateVictoryMessageFlow(input);
}

const victoryMessagePrompt = ai.definePrompt({
  name: 'victoryMessagePrompt',
  input: {
    schema: z.object({
      playerName: z.string().describe('The name of the player.'),
      score: z.number().describe('The final score of the player.'),
      time: z.string().describe('The time survived in the game.'),
    }),
  },
  output: {
    schema: z.object({
      message: z.string().describe('The AI-generated victory message.'),
    }),
  },
  prompt: `Congratulations, {{{playerName}}}!

You have cleared all the asteroids and achieved a score of {{score}} in {{time}}!

Write a triumphant, over-the-top victory message in neon-glow text, reminiscent of an 80s arcade game, to celebrate this victory.
`,
});

const generateVictoryMessageFlow = ai.defineFlow<
  typeof VictoryMessageInputSchema,
  typeof VictoryMessageOutputSchema
>(
  {
    name: 'generateVictoryMessageFlow',
    inputSchema: VictoryMessageInputSchema,
    outputSchema: VictoryMessageOutputSchema,
  },
  async input => {
    const {output} = await victoryMessagePrompt(input);
    return output!;
  }
);
