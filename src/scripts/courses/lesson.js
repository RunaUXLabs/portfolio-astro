(() => {
  const stage = document.querySelector('deck-stage');
  const select = document.getElementById('part-select');
  const parts = [...select.options];
  let activeIndex = 0;
  const notes = document.getElementById('study-notes');
  const toggle = document.getElementById('notes-toggle');
  const articles = [...notes.querySelectorAll('.lesson-note')];
  const mobile = document.getElementById('mobile-reading');
  const slides = [...stage.children];
  const roleLabels = { core: '함께 볼 핵심 내용', reference: '과제할 때 참고', task: '데일리 과제' };
  const routeIndexes = slides.flatMap((slide, index) => slide.dataset.learningRole !== 'reference' ? [index] : []);
  const nextCore = document.getElementById('next-core');
  select.disabled = true;
  const readingMedia = window.matchMedia('(max-width: 760px)');
  const isMobile = () => readingMedia.matches;
  const jumpMobile = (index) => {
    if (!isMobile()) return;
    const target = document.getElementById(`reading-${slides[index].id}`);
    mobile.scrollTo({ top: target.offsetTop, behavior: 'instant' });
  };
  readingMedia.addEventListener('change', () => {
    if (!select.disabled) { update(activeIndex); jumpMobile(activeIndex); }
  });
  const indexFromHash = () => {
    const legacyPart = location.hash.match(/^#plan-part-(\d+)$/);
    if (legacyPart) return ({ 1: 0, 2: 0, 3: 3, 4: 7, 5: 12, 6: 3, 7: 4 })[legacyPart[1]] ?? 0;
    return Number(location.hash.slice(1)) - 1;
  };
  const requestedInitial = indexFromHash();
  const lessonDay = slides[0]?.dataset.lessonDay || '';
  const partSummaries = parts.map((option) => option.dataset.summary || "");
  const update = (index) => {
    activeIndex = index;
    const currentPart = parts.filter((option) => Number(option.value) <= index).at(-1);
    select.value = currentPart?.value || '0';
    const part = currentPart?.textContent || '01 조사 범위 정하기';
    document.getElementById('part-number').textContent = part.slice(0, 2);
    document.getElementById('part-title').textContent = part.slice(3);
    document.getElementById('reading-location').textContent = `${lessonDay}일차 · ${part}`;
    document.getElementById('reading-position').textContent = `전체 내용 ${index + 1} / ${slides.length}`;
    document.querySelector('.lesson-footer').style.setProperty('--lesson-progress', `${((index + 1) / slides.length) * 100}%`);
    const readingDetails = document.getElementById(`reading-details-${slides[index].id}`);
    toggle.setAttribute('aria-controls', isMobile() ? readingDetails?.id || 'study-notes' : 'study-notes');
    toggle.setAttribute('aria-expanded', String(isMobile() ? !!readingDetails?.open : !notes.hidden));
    const next = routeIndexes.find((value) => value > index);
    nextCore.disabled = next === undefined;
    nextCore.textContent = next === undefined ? '마지막 장표' : slides[next].dataset.learningRole === 'task' ? '다음 과제 안내' : '다음 핵심';
    articles.forEach((article) => { article.hidden = article.dataset.noteFor !== slides[index]?.id; });
    const hash = `#${index + 1}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  };
  slides.forEach((slide, index) => {
    const clone = slide.cloneNode(true);
    clone.id = `reading-${slide.id}`;
    clone.removeAttribute('data-deck-active');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    const roleLabel = document.createElement('p');
    roleLabel.className = 'mobile-role';
    roleLabel.textContent = roleLabels[slide.dataset.learningRole] || roleLabels.reference;
    clone.prepend(roleLabel);
    const partIndex = parts.findIndex((option) => Number(option.value) === index);
    if (partIndex >= 0) {
      clone.classList.add('part-opening');
      const banner = document.createElement('header');
      banner.className = 'reading-part-banner';
      const number = document.createElement('p');
      number.className = 'reading-part-number';
      number.textContent = `PART ${String(partIndex + 1).padStart(2, '0')} / ${String(parts.length).padStart(2, '0')}`;
      const title = document.createElement('h2');
      title.textContent = parts[partIndex].textContent.slice(3);
      const summary = document.createElement('p');
      summary.textContent = partSummaries[partIndex];
      banner.append(number, title, summary);
      clone.prepend(banner);
    }
    const article = articles.find((element) => element.dataset.noteFor === slide.id)?.cloneNode(true);
    if (article) {
      article.hidden = false;
      article.removeAttribute('data-note-for');
      const details = article.querySelector('.reference-details');
      details.id = `reading-details-${slide.id}`;
      details.addEventListener('toggle', () => {
        if (isMobile() && slides[activeIndex] === slide) toggle.setAttribute('aria-expanded', String(details.open));
      });
      clone.appendChild(article);
    }
    mobile.appendChild(clone);
  });
  mobile.tabIndex = 0;
  let readingFrame;
  mobile.addEventListener('scroll', () => {
    if (!isMobile() || select.disabled || readingFrame) return;
    readingFrame = requestAnimationFrame(() => {
      readingFrame = null;
      const edge = mobile.getBoundingClientRect().top + 48;
      const index = [...mobile.children].findIndex((section) => section.getBoundingClientRect().bottom > edge);
      if (index >= 0 && index !== activeIndex) stage.goTo(index);
    });
  }, { passive: true });
  stage.addEventListener('slidechange', (event) => update(event.detail.index));
  nextCore.addEventListener('click', () => {
    const next = routeIndexes.find((value) => value > activeIndex);
    if (next === undefined) return;
    stage.goTo(next);
    jumpMobile(next);
  });
  const openNotes = (open) => {
    notes.hidden = !open;
    document.body.classList.toggle('notes-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) notes.scrollTop = 0;
    else toggle.focus();
    window.dispatchEvent(new Event('resize'));
  };
  toggle.addEventListener('click', () => {
    if (isMobile()) {
      const article = document.querySelector(`#reading-${slides[activeIndex].id} .lesson-note`);
      article.querySelector('.reference-details').open = true;
      const top = mobile.scrollTop + article.getBoundingClientRect().top - mobile.getBoundingClientRect().top;
      mobile.scrollTo({ top, behavior: 'instant' });
    } else openNotes(notes.hidden);
  });
  document.getElementById('notes-close').addEventListener('click', () => openNotes(false));
  select.addEventListener('change', () => {
    const index = Number(select.value);
    stage.goTo(index);
    jumpMobile(index);
  });
  window.addEventListener('hashchange', () => {
    const index = indexFromHash();
    if (Number.isInteger(index) && index >= 0 && index < slides.length) stage.goTo(index);
  });
  customElements.whenDefined('deck-stage').then(async () => {
    // Definition can precede the stage's initial slot collection.
    if (!slides.some((slide) => slide.hasAttribute('data-deck-active'))) {
      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (slides.some((slide) => slide.hasAttribute('data-deck-active'))) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(stage, { attributes: true, subtree: true, attributeFilter: ['data-deck-active'] });
      });
    }
    const index = requestedInitial;
    const initial = Number.isInteger(index) && index >= 0 && index < slides.length ? index : 0;
    stage.goTo(initial);
    update(initial);
    select.disabled = false;
    jumpMobile(initial);
  });
  // Keep normal reading keys on narrow screens instead of navigating the hidden deck.
  document.addEventListener('keydown', (event) => {
    if ((isMobile() || event.target.closest?.('.lesson-note')) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', ' '].includes(event.key)) {
      const interactive = event.target.closest?.('input, textarea, select, button, summary, a, [contenteditable="true"]');
      if (isMobile() && !interactive && !['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Home' || event.key === 'End') {
          mobile.scrollTo({ top: event.key === 'Home' ? 0 : mobile.scrollHeight, behavior: 'instant' });
        } else {
          const direction = ['ArrowUp', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey) ? -1 : 1;
          const distance = event.key.startsWith('Arrow') ? 48 : mobile.clientHeight * .85;
          mobile.scrollBy({ top: direction * distance, behavior: 'instant' });
        }
      }
      event.stopImmediatePropagation();
    }
  }, true);
})();
