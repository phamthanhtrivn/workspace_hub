(() => {
  const one = (selector, parent = document) => parent.querySelector(selector);
  const all = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  one('[data-toggle-navigation]')?.addEventListener('click', () => one('.rail')?.classList.toggle('expanded'));
  one('[data-notifications]')?.addEventListener('click', event => {
    event.stopPropagation();
    const popover = one('.notification-popover');
    popover.hidden = !popover.hidden;
  });
  document.addEventListener('click', event => {
    const popover = one('.notification-popover');
    if (popover && !event.target.closest('.notification-popover') && !event.target.closest('[data-notifications]')) popover.hidden = true;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      all('.notification-popover').forEach(element => element.hidden = true);
      const overlay = one('.overlay[data-dismissible]');
      if (overlay) location.href = overlay.dataset.dismissible;
    }
  });
  all('[data-close-overlay]').forEach(button => button.addEventListener('click', () => location.href = button.dataset.closeOverlay));
  all('[data-toast]').forEach(button => button.addEventListener('click', () => {
    const toast = one('#toast');
    toast.textContent = button.dataset.toast;
    toast.hidden = false;
    setTimeout(() => toast.hidden = true, 2300);
  }));
  all('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copy); } catch {}
    button.textContent = 'Copied';
  }));
  all('[data-filter]').forEach(input => input.addEventListener('input', () => {
    const value = input.value.toLowerCase();
    all(input.dataset.filter).forEach(item => item.classList.toggle('hide', !item.textContent.toLowerCase().includes(value)));
  }));
  all('[data-setting-tab]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    all('[data-setting-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
    all('.settings-tab').forEach(panel => panel.hidden = panel.id !== button.dataset.settingTab);
  }));
  const timer = one('[data-timer-toggle]');
  if (timer) {
    let running = false;
    let seconds = 18 * 60 + 42;
    let interval;
    timer.addEventListener('click', () => {
      running = !running;
      timer.textContent = running ? 'Pause' : 'Resume';
      one('[data-timer-status]').textContent = running ? 'Focusing' : 'Paused';
      clearInterval(interval);
      if (running) interval = setInterval(() => {
        seconds = Math.max(0, seconds - 1);
        one('[data-timer-time]').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      }, 1000);
    });
    one('[data-timer-reset]')?.addEventListener('click', () => {
      clearInterval(interval); running = false; seconds = 25 * 60;
      one('[data-timer-time]').textContent = '25:00';
      one('[data-timer-status]').textContent = 'Ready to start';
      timer.textContent = 'Start focus';
    });
  }
  all('[data-composer]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const input = one('textarea', form);
    if (!input.value.trim()) return;
    const container = one(form.dataset.composer);
    const row = document.createElement('div');
    row.className = 'message';
    row.innerHTML = '<span class="avatar">AT</span><div class="body"><header><strong>Alex Tran</strong><small>Just now</small></header><p></p></div>';
    one('p', row).textContent = input.value;
    container.append(row); input.value = ''; container.scrollTop = container.scrollHeight;
  }));
  all('[data-room-control]').forEach(button => button.addEventListener('click', () => {
    button.classList.toggle('off');
    button.setAttribute('aria-pressed', String(button.classList.contains('off')));
  }));
})();
