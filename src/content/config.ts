import { defineCollection } from 'astro:content';

export const collections = {
  courses: defineCollection({ type: 'data' }),
};
