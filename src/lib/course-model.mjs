export function lessonUrl(base, chapter, day) {
  return `${base.replace(/\/?$/, '/')}courses/${chapter.slug}/day/${day}/`;
}

export function chapterAssetBase(base, chapter) {
  return `${base.replace(/\/?$/, '/')}${chapter.assetPath}`;
}

export function richHtml(html = '', assetBase = '') {
  return html.replace(/\b(src|href)=(['"])assets\//g, (_, attr, quote) => `${attr}=${quote}${assetBase}assets/`);
}

export function validateChapter(chapter, lessons) {
  const fail = (message) => { throw new Error(`${chapter.slug}: ${message}`); };
  if (!/^[a-z0-9-]+$/.test(chapter.slug)) fail('invalid chapter slug');
  if (!chapter.days.length || new Set(chapter.days).size !== chapter.days.length) fail('duplicate or missing days');
  const ids = new Set();
  const files = new Set();
  for (const day of chapter.days) {
    const lesson = lessons.find((item) => item.day === day);
    if (!lesson || !lesson.slides.length) fail(`day ${day} has no content`);
    if (!/^(index|day\d+)\.html$/.test(lesson.legacyFile) || files.has(lesson.legacyFile)) fail(`day ${day} has an invalid or duplicate legacy address`);
    files.add(lesson.legacyFile);
    if (!(lesson.lectureMinutes > 0 && lesson.assignmentMinutes > 0)) fail(`day ${day} needs a time allocation`);
    if (lesson.parts[0]?.start !== 0) fail(`day ${day} must begin at its first slide`);
    lesson.parts.forEach((part, index) => {
      if (!Number.isInteger(part.start) || part.start >= lesson.slides.length || (index > 0 && part.start <= lesson.parts[index - 1].start)) fail(`day ${day} has invalid part boundaries`);
      if (!part.title || !part.summary) fail(`day ${day} needs part titles and summaries`);
    });
    for (const slide of lesson.slides) {
      if (ids.has(slide.id)) fail(`duplicate slide ${slide.id}`);
      ids.add(slide.id);
      if (!['core', 'reference', 'task'].includes(slide.role)) fail(`unknown role for ${slide.id}`);
      if (!slide.titleHtml || !slide.blocks?.length || !slide.notes?.bodyHtml || !slide.notes?.briefHtml) fail(`incomplete slide ${slide.id}`);
    }
  }
  return chapter;
}
