import { validateChapter } from './course-model.mjs';

const metadata = import.meta.glob('../content/courses/*/chapter.json', { eager: true, import: 'default' });
const dayFiles = import.meta.glob('../content/courses/*/day*.json', { eager: true, import: 'default' });

// One chapter manifest and one data file per day; routes and menus follow automatically.
export const chapters = Object.entries(metadata).map(([path, value]) => {
  const chapter = value as any;
  const directory = path.slice(0, path.lastIndexOf('/') + 1);
  const lessons = Object.entries(dayFiles)
    .filter(([file]) => file.startsWith(directory))
    .map(([, lesson]) => lesson as any);
  validateChapter(chapter, lessons);
  return { ...chapter, lessons: chapter.days.map((day: number) => lessons.find((lesson) => lesson.day === day)) };
});
