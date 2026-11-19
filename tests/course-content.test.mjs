import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateChapter, lessonUrl, chapterAssetBase, richHtml } from '../src/lib/course-model.mjs';

const root = new URL('../src/content/courses/', import.meta.url);
const chapters = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => {
  const folder = new URL(`${entry.name}/`, root);
  const read = name => JSON.parse(readFileSync(new URL(name, folder), 'utf8'));
  return { chapter: read('chapter.json'), lessons: readdirSync(folder).filter(name => /^day\d+\.json$/.test(name)).map(read) };
});

test('every published lesson belongs to its chapter and has valid navigation and content', () => {
  for (const { chapter, lessons } of chapters) {
    validateChapter(chapter, lessons);
    assert.deepEqual(lessons.map(item => item.day).sort((a,b) => a-b), [...chapter.days].sort((a,b) => a-b));
    for (const lesson of lessons) {
      assert.equal(lesson.lectureMinutes, 150);
      assert.equal(lesson.assignmentMinutes, 60);
      assert.equal(lesson.parts.length, 4);
      assert.ok(lesson.slides.some(slide => slide.role === 'task'));
      for (const slide of lesson.slides) {
        assert.ok(slide.actionHtml && slide.label && slide.notes.summary);
        const inspect = blocks => blocks.forEach(block => {
          assert.ok(['html','columns','steps','panel','table','placeholder'].includes(block.type));
          if (block.type === 'table') block.rows.forEach(row => assert.equal(row.length, block.headers.length));
          if (block.type === 'columns') block.columns.forEach(inspect);
        });
        inspect(slide.blocks);
      }
    }
  }
});

test('future authoring errors fail before generating broken navigation', () => {
  const { chapter, lessons } = structuredClone(chapters[0]);
  lessons[0].slides[1].id = lessons[0].slides[0].id;
  assert.throws(() => validateChapter(chapter, lessons), /duplicate slide/);
  lessons[0].slides[1].id = 'unique';
  lessons[0].parts[1].start = 0;
  assert.throws(() => validateChapter(chapter, lessons), /part boundaries/);
});

test('nested day routes resolve chapter media without changing external sources', () => {
  const chapter = chapters[0].chapter;
  assert.equal(lessonUrl('/portfolio-astro/', chapter, 41), '/portfolio-astro/courses/oz-ai-bx-3/day/41/');
  const base = chapterAssetBase('/portfolio-astro/', chapter);
  assert.equal(richHtml('<img src="assets/day38/test.png"><a href="https://example.com">元</a>', base), '<img src="/portfolio-astro/courses/oz-ai-bx-3/assets/day38/test.png"><a href="https://example.com">元</a>');
});
