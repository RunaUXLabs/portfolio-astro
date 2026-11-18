(() => {
  const stage = document.querySelector('deck-stage');
  const select = document.getElementById('slide-select');
  const notes = document.getElementById('study-notes');
  const toggle = document.getElementById('notes-toggle');
  const articles = [...notes.querySelectorAll('.lesson-note')];
  const mobile = document.getElementById('mobile-reading');
  const slides = [...stage.children];
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  const update = (index) => {
    select.value = String(index);
    const secondPart = index >= 4;
    document.getElementById('part-number').textContent = secondPart ? '02' : '01';
    document.getElementById('part-title').textContent = secondPart ? '원문 수집과 AI 비교' : '조사 범위 정하기';
    articles.forEach((article) => { article.hidden = article.dataset.noteFor !== slides[index]?.id; });
    const hash = `#${index + 1}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  };
  slides.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.id = `reading-${slide.id}`;
    clone.removeAttribute('data-deck-active');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    const article = articles.find((element) => element.dataset.noteFor === slide.id)?.cloneNode(true);
    if (article) { article.hidden = false; article.removeAttribute('data-note-for'); clone.appendChild(article); }
    mobile.appendChild(clone);
  });
  stage.addEventListener('slidechange', (event) => update(event.detail.index));
  const openNotes = (open) => {
    notes.hidden = !open;
    document.body.classList.toggle('notes-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) notes.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else toggle.focus();
    window.dispatchEvent(new Event('resize'));
  };
  toggle.addEventListener('click', () => openNotes(notes.hidden));
  document.getElementById('notes-close').addEventListener('click', () => openNotes(false));
  select.addEventListener('change', () => {
    const index = Number(select.value);
    stage.goTo(index);
    if (isMobile()) document.getElementById(`reading-${slides[index].id}`).scrollIntoView({ behavior: 'auto' });
  });
  window.addEventListener('hashchange', () => {
    const index = Number(location.hash.slice(1)) - 1;
    if (Number.isInteger(index) && index >= 0 && index < slides.length) stage.goTo(index);
  });
  customElements.whenDefined('deck-stage').then(() => {
    const index = Number(location.hash.slice(1)) - 1;
    const initial = Number.isInteger(index) && index >= 0 && index < slides.length ? index : 0;
    stage.goTo(initial);
    update(initial);
    if (isMobile() && initial > 0) document.getElementById(`reading-${slides[initial].id}`).scrollIntoView({ behavior: 'auto' });
  });
  // Keep normal reading keys on narrow screens instead of navigating the hidden deck.
  document.addEventListener('keydown', (event) => {
    if (isMobile() && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', ' '].includes(event.key)) {
      event.stopImmediatePropagation();
    }
  }, true);
})();
