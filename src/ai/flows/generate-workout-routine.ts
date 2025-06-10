// src/ai/flows/generate-workout-routine.ts
'use server';
/**
 * @fileOverview Generates personalized workout routine ideas based on user preferences and available classes.
 *
 * - generateWorkoutRoutine - A function that generates workout routines.
 * - GenerateWorkoutRoutineInput - The input type for the generateWorkoutRoutine function.
 * - GenerateWorkoutRoutineOutput - The return type for the generateWorkoutRoutine function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWorkoutRoutineInputSchema = z.object({
  availableClasses: z
    .array(
      z.string().describe('The types of classes available (e.g., Yoga, HIIT, Strength Training).')
    )
    .describe('A list of available class types.'),
  historicalSignups: z
    .array(z.string())
    .optional()
    .describe('The user historical class signups.'),
  userGoals: z.string().describe('The fitness goals of the user (e.g., weight loss, muscle gain, endurance).'),
});
export type GenerateWorkoutRoutineInput = z.infer<typeof GenerateWorkoutRoutineInputSchema>;

const GenerateWorkoutRoutineOutputSchema = z.object({
  workoutRoutine: z.string().describe('A personalized workout routine idea based on user preferences and available classes.'),
});
export type GenerateWorkoutRoutineOutput = z.infer<typeof GenerateWorkoutRoutineOutputSchema>;

export async function generateWorkoutRoutine(input: GenerateWorkoutRoutineInput): Promise<GenerateWorkoutRoutineOutput> {
  return generateWorkoutRoutineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorkoutRoutinePrompt',
  input: {schema: GenerateWorkoutRoutineInputSchema},
  output: {schema: GenerateWorkoutRoutineOutputSchema},
  prompt: `You are a personal trainer who is tasked with creating personalized workout routines.

  Consider the user's fitness goals, available classes, and historical signups to generate a workout routine that is safe and effective.

  Fitness Goals: {{{userGoals}}}
  Available Classes: {{#each availableClasses}}{{{this}}}, {{/each}}
  Historical Signups: {{#if historicalSignups}}{{#each historicalSignups}}{{{this}}}, {{/each}}{{else}}None{{/if}}

  Workout Routine Idea:`,
});

const generateWorkoutRoutineFlow = ai.defineFlow(
  {
    name: 'generateWorkoutRoutineFlow',
    inputSchema: GenerateWorkoutRoutineInputSchema,
    outputSchema: GenerateWorkoutRoutineOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
