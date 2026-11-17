/* Shared by standalone HTML decks and Astro course pages. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || window.RunaCourseAnalytics) return;
  const identifier = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : '';
  const context = {
    course_id: identifier(script.dataset.courseId),
    cohort: identifier(script.dataset.cohort),
    chapter_id: identifier(script.dataset.chapterId),
  };
  if (Object.values(context).some((value) => !value)) return;
  // All measurements are authored IDs; never send prompts, answers, names or URLs with query strings.
  const cleanUrl = (value) => {
    try { const url = new URL(value); return `${url.origin}${url.pathname}`; }
    catch { return ''; }
  };
  let destination = '';
  let ready = false;
  let debug = false;
  const once = new Set();
  const pending = new Map();
  const visible = new Set();
  const watched = new WeakSet();
  const lessonDay = (element) => {
    const value = element?.closest('[data-lesson-day]')?.dataset.lessonDay;
    return /^\d{1,3}$/.test(value || '') ? value : '';
  };
  const send = (event, params = {}) => {
    if (!ready) return;
    window.gtag('event', event, {
      ...context, ...params,
      send_to: destination,
      page_location: cleanUrl(window.location.href),
      page_referrer: cleanUrl(document.referrer),
      ...(debug ? { debug_mode: true } : {}),
    });
  };
  const sendOnce = (event, id, params) => {
    const key = `${event}:${id}`;
    if (once.has(key)) return;
    once.add(key);
    send(event, params);
  };
  const view = (element) => {
    const day = lessonDay(element);
    if (day) sendOnce('lesson_view', day, { lesson_day: day });
    const slide = identifier(element.dataset.slideId);
    if (slide) sendOnce('slide_view', slide, { slide_id: slide, ...(day ? { lesson_day: day } : {}) });
    const task = identifier(element.dataset.taskId);
    if (task) sendOnce('task_view', task, { task_id: task, ...(day ? { lesson_day: day } : {}) });
  };
  const cancel = (element) => {
    if (pending.has(element)) window.clearTimeout(pending.get(element));
    pending.delete(element);
  };
  const schedule = (element) => {
    cancel(element);
    if (document.visibilityState !== 'visible') return;
    pending.set(element, window.setTimeout(() => {
      pending.delete(element);
      if (document.visibilityState === 'visible' && visible.has(element)) view(element);
    }, 1000));
  };
  let observer;
  const observeContent = () => {
    const root = document.querySelector('[data-course-root]');
    if (!root) return;
    root.querySelectorAll('[data-lesson-day], [data-slide-id], [data-task-id]').forEach((element) => {
      // Fixed slide decks report their active slide via slidechange, not document scrolling.
      if (element.closest('deck-stage') || watched.has(element)) return;
      watched.add(element);
      observer?.observe(element);
    });
  };
  const copyPrompt = async (button) => {
    const prompt = identifier(button?.dataset.promptId);
    const targetId = identifier(button?.dataset.copyTarget);
    const root = document.querySelector('[data-course-root]');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!prompt || !target || !root?.contains(button) || !root.contains(target)) return false;
    try {
      await navigator.clipboard.writeText(target.textContent || '');
      const day = lessonDay(button);
      send('prompt_copy', { prompt_id: prompt, ...(day ? { lesson_day: day } : {}) });
      button.dispatchEvent(new CustomEvent('course:copy-success', { bubbles: true }));
      return true;
    } catch {
      button.dispatchEvent(new CustomEvent('course:copy-failed', { bubbles: true }));
      return false;
    }
  };
  window.RunaCourseAnalytics = { copyPrompt, get enabled() { return ready; } };

  const initialize = async () => {
    let config;
    try {
      const response = await fetch(new URL('analytics-config.json', script.src), { cache: 'no-cache' });
      if (!response.ok) return;
      config = await response.json();
    } catch { return; }
    const measurement = config.measurementId;
    if (!/^G-[A-Z0-9]+$/.test(measurement || '') || measurement === 'G-21ZNJNXE5G') return;
    if (!Array.isArray(config.allowedHostnames) || !config.allowedHostnames.includes(window.location.hostname)) return;
    if (typeof config.pathPrefix !== 'string' || !config.pathPrefix.endsWith('/') || !window.location.pathname.startsWith(config.pathPrefix)) return;
    destination = measurement;
    debug = config.debug === true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${destination}`;
    window.gtag('js', new Date());
    window.gtag('config', destination, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: cleanUrl(window.location.href),
      page_referrer: cleanUrl(document.referrer),
      ...context,
      ...(debug ? { debug_mode: true } : {}),
    });
    document.head.appendChild(tag);
    ready = true;
    // One pageview for the document. Slide/day changes are events, not extra pageviews.
    send('page_view', { page_title: document.title });
    send('course_open');
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio, intersectionRect, boundingClientRect }) => {
          // Tall workbook sections must not require half their entire height on screen.
          const visibleEnough = intersectionRect && boundingClientRect
            ? intersectionRect.height >= Math.min(boundingClientRect.height, window.innerHeight * 0.8) * 0.5
            : intersectionRatio >= 0.5;
          if (isIntersecting && visibleEnough) {
            visible.add(target);
            schedule(target);
          } else {
            visible.delete(target);
            cancel(target);
          }
        });
      }, { threshold: Array.from({ length: 101 }, (_,index) => index / 100) });
    }
    observeContent();
    const root = document.querySelector('[data-course-root]');
    if (root && typeof MutationObserver === 'function') {
      new MutationObserver(observeContent).observe(root, { childList: true, subtree: true });
    }
    let activeSlide;
    const activateSlide = (element) => {
      if (activeSlide) { visible.delete(activeSlide); cancel(activeSlide); }
      activeSlide = element;
      if (element && root?.contains(element)) { visible.add(element); schedule(element); }
    };
    document.addEventListener('slidechange', (event) => activateSlide(event.detail?.slide));
    activateSlide(root?.querySelector('deck-stage > [data-deck-active]'));
    document.addEventListener('visibilitychange', () => {
      visible.forEach((element) => document.visibilityState === 'visible' ? schedule(element) : cancel(element));
    });
  };
  // Copy remains usable with tracking disabled. Count only successful clipboard writes.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('button[data-prompt-id][data-copy-target]');
    if (button && !button.disabled) void copyPrompt(button);
    const link = target?.closest('a[data-resource-id]');
    const root = document.querySelector('[data-course-root]');
    const resource = identifier(link?.dataset.resourceId);
    if (resource && root?.contains(link)) {
      const day = lessonDay(link);
      send('resource_open', { resource_id: resource, ...(day ? { lesson_day: day } : {}) });
    }
  });
  void initialize();
})();
