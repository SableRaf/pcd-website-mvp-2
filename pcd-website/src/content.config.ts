import { defineCollection, z } from 'astro:content';

const events = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    short_description: z.string().optional(),
  }).passthrough(),
});

export const collections = {
  events,
};
