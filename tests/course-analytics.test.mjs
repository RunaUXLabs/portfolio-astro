import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../public/courses/course-analytics.js', import.meta.url), 'utf8');
const configFile = JSON.parse(readFileSync(new URL('../public/courses/analytics-config.json', import.meta.url), 'utf8'));

async function harness(overrides = {}) {
  const listeners = new Map();
  const timers = new Map();
  const tags = [];
  const copied = [];
  let clock = 0;
  let intersection;
  class Element {
    constructor(dataset = {}, parent = null) { this.dataset = dataset; this.parent = parent; }
    closest(selector) {
      if (selector === 'deck-stage') return this.inDeck ? this : null;
      if (selector === '[data-lesson-day]') return this.dataset.lessonDay ? this : this.parent?.closest(selector);
      if (selector.startsWith('button')) return this.dataset.copyTarget ? this : null;
      if (selector.startsWith('a[')) return this.dataset.resourceId ? this : null;
      return null;
    }
    dispatchEvent() {}
  }
  const slide = new Element({ lessonDay: '38', slideId: 'D38-L01', taskId: 'day38-task' });
  const prompt = new Element();
  prompt.textContent = 'Private prompt contents are never analytics parameters';
  const button = new Element({ promptId: 'P1', copyTarget: 'prompt-1' }, slide);
  const link = new Element({ resourceId: 'workbook-W2' }, slide);
  const root = {
    contains: (element) => [slide, prompt, button, link].includes(element),
    querySelectorAll: () => [slide],
    querySelector: () => null,
  };
  const document = {
    currentScript: {
      src: 'https://runauxlabs.github.io/portfolio-astro/courses/course-analytics.js',
      dataset: { courseId: 'ai-bx', cohort: '3', chapterId: 'benchmark-brand' },
    },
    title: 'AI BX 교안',
    referrer: 'https://example.com/start?email=private@example.com',
    visibilityState: 'visible',
    querySelector: () => root,
    getElementById: (id) => id === 'prompt-1' ? prompt : null,
    createElement: () => ({}),
    head: { appendChild: (tag) => tags.push(tag) },
    addEventListener: (name, callback) => listeners.set(name, callback),
  };
  const window = {
    innerHeight: 1000,
    location: {
      hostname: overrides.hostname || 'runauxlabs.github.io',
      pathname: overrides.pathname || '/portfolio-astro/courses/oz-ai-bx-3/brand/',
      href: 'https://runauxlabs.github.io/portfolio-astro/courses/oz-ai-bx-3/brand/?student=private#D38-L01',
    },
    setTimeout: (callback) => { timers.set(++clock, callback); return clock; },
    clearTimeout: (id) => timers.delete(id),
  };
  class IntersectionObserver {
    constructor(callback) { intersection = callback; }
    observe() {}
  }
  const config = { ...configFile, measurementId: 'G-COURSE123', ...overrides.config };
  runInNewContext(source, {
    window, document, Element, URL, IntersectionObserver,
    CustomEvent: class { constructor(name) { this.type = name; } },
    navigator: { clipboard: { writeText: async (value) => {
      if (overrides.copyFails) throw new Error('clipboard denied');
      copied.push(value);
    } } },
    fetch: async () => ({ ok: true, json: async () => config }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  return {
    window, document, tags, slide, button, link, copied,
    events: () => (window.dataLayer || []).filter((entry) => entry[0] === 'event').map((entry) => ({ name: entry[1], params: entry[2] })),
    intersect: (visible = true) => intersection([{ target: slide, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]),
    intersectTall: () => intersection([{ target: slide, isIntersecting: true, intersectionRatio: 0.05,
      boundingClientRect: { height: 10000 }, intersectionRect: { height: 500 } }]),
    emit: (name, payload = {}) => listeners.get(name)?.(payload),
    tick: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((callback) => callback()); },
  };
}

test('no collection until a separate course ID is supplied, or on local/portfolio paths', async () => {
  for (const options of [
    { config: { measurementId: '' } },
    { config: { measurementId: 'G-21ZNJNXE5G' } },
    { hostname: 'localhost' },
    { pathname: '/portfolio-astro/about/' },
  ]) {
    const h = await harness(options);
    assert.equal(h.tags.length, 0);
    assert.equal(h.events().length, 0);
    assert.equal(h.window.RunaCourseAnalytics.enabled, false);
  }
});

test('page and course events go only to the separate destination with clean URLs', async () => {
  const h = await harness();
  assert.equal(h.tags.length, 1);
  assert.deepEqual(Array.from(h.events(), (event) => event.name), ['page_view', 'course_open']);
  for (const { params } of h.events()) {
    assert.equal(params.send_to, 'G-COURSE123');
    assert.equal(params.course_id, 'ai-bx');
    assert.equal(params.cohort, '3');
    assert.equal(params.chapter_id, 'benchmark-brand');
    assert.equal(params.page_location.includes('?'), false);
    assert.equal(params.page_location.includes('#'), false);
    assert.equal(params.page_referrer, 'https://example.com/start');
  }
  const config = h.window.dataLayer.find((entry) => entry[0] === 'config');
  assert.equal(config[2].send_page_view, false);
});

test('a transient or hidden slide does not count; repeated visible slides count once per page', async () => {
  const h = await harness();
  h.intersect();
  h.intersect(false);
  h.tick();
  assert.equal(h.events().filter((event) => event.name === 'slide_view').length, 0);
  h.intersect();
  h.document.visibilityState = 'hidden';
  h.emit('visibilitychange');
  h.tick();
  assert.equal(h.events().filter((event) => event.name === 'slide_view').length, 0);
  h.document.visibilityState = 'visible';
  h.emit('visibilitychange');
  h.tick();
  h.intersect();
  h.tick();
  for (const event of ['lesson_view', 'slide_view', 'task_view']) {
    assert.equal(h.events().filter((entry) => entry.name === event).length, 1);
  }
});

test('deck-stage navigation counts active slides without inflating pageviews', async () => {
  const h = await harness();
  h.emit('slidechange', { detail: { slide: h.slide } });
  h.tick();
  assert.equal(h.events().filter((event) => event.name === 'slide_view').length, 1);
  assert.equal(h.events().filter((event) => event.name === 'page_view').length, 1);
});

test('tall workbook sections count by viewport visibility rather than total section height', async () => {
  const h = await harness();
  h.intersectTall();
  h.tick();
  assert.equal(h.events().filter((event) => event.name === 'task_view').length, 1);
});

test('copy counts only clipboard success and never sends prompt contents', async () => {
  for (const copyFails of [false, true]) {
    const h = await harness({ copyFails });
    const result = await h.window.RunaCourseAnalytics.copyPrompt(h.button);
    assert.equal(result, !copyFails);
    assert.equal(h.events().filter((event) => event.name === 'prompt_copy').length, copyFails ? 0 : 1);
    assert.equal(JSON.stringify(h.events()).includes('Private prompt'), false);
  }
});

test('authored resource IDs are counted without the link URL or text', async () => {
  const h = await harness();
  h.emit('click', { target: h.link });
  const event = h.events().find((entry) => entry.name === 'resource_open');
  assert.equal(event.params.resource_id, 'workbook-W2');
  assert.equal(event.params.lesson_day, '38');
  assert.equal('link_url' in event.params, false);
});

test('copy works before the measurement ID is connected', async () => {
  const h = await harness({ config: { measurementId: '' } });
  assert.equal(await h.window.RunaCourseAnalytics.copyPrompt(h.button), true);
  assert.equal(h.copied.length, 1);
  assert.equal(h.events().length, 0);
});
