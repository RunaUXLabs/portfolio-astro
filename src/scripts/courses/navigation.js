(() => {
  const daySelect = document.getElementById('day-select');
  if (!daySelect) return;
  const currentDay = daySelect.querySelector('option[selected]')?.value;
  const syncDay = () => { if (currentDay) daySelect.value = currentDay; };
  syncDay();
  window.addEventListener('pageshow', syncDay);
  daySelect.addEventListener('change', () => {
    const destination = daySelect.selectedOptions[0]?.dataset.href;
    if (destination) window.location.assign(destination);
  });
})();
