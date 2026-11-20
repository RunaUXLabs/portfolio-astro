import { chapters } from "../../../lib/course-registry";
import { lessonUrl } from "../../../lib/course-model.mjs";

export function getStaticPaths() {
  const chapter = chapters.find(item => item.id === "ai-benchmark-brand");
  return chapter.lessons.filter(lesson => lesson.legacyFile !== "index.html").map(lesson => ({
    params: { legacy: lesson.legacyFile }, props: { chapter, lesson }
  }));
}

export function GET({ props }) {
  const target = lessonUrl(import.meta.env.BASE_URL, props.chapter, props.lesson.day);
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><title>교안으로 이동</title></head><body><a href="${target}">교안으로 이동</a><script>location.replace(${JSON.stringify(target)} + location.hash);</script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
