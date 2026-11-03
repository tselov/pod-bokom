'use strict';

// Примеры: замените значениями реальных свободных ячеек вместе с HTML-карточками.
const units = {
  '01': 'Ячейка 01 · 1 м² · 1 500 ₽/мес (пример)',
  '02': 'Ячейка 02 · 2 м² · 2 500 ₽/мес (пример)',
  '03': 'Ячейка 03 · 3 м² · 3 500 ₽/мес (пример)'
};
const requestDialog = document.querySelector('#request-dialog');
const privacyDialog = document.querySelector('#privacy-dialog');
const form = document.querySelector('#request-form');
const fields = document.querySelector('#request-fields');
const result = document.querySelector('#request-result');
const phone = document.querySelector('#customer-phone');
const customerName = document.querySelector('#customer-name');
const error = document.querySelector('#form-error');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
let activeTrigger = null;

function closeMenu() {
  mobileMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
}
menuToggle.addEventListener('click', () => {
  const opened = menuToggle.getAttribute('aria-expanded') === 'true';
  mobileMenu.hidden = opened;
  menuToggle.setAttribute('aria-expanded', String(!opened));
  menuToggle.setAttribute('aria-label', opened ? 'Открыть меню' : 'Закрыть меню');
});
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileMenu.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

document.querySelectorAll('[data-request]').forEach(button => {
  button.addEventListener('click', () => {
    activeTrigger = mobileMenu.contains(button) ? menuToggle : button;
    closeMenu();
    document.querySelector('#selection').textContent = units[button.dataset.unit] || 'Помощь с выбором ячейки';
    form.reset();
    error.textContent = '';
    phone.removeAttribute('aria-invalid');
    customerName.setCustomValidity('');
    fields.hidden = false;
    result.hidden = true;
    requestDialog.setAttribute('aria-labelledby', 'request-title');
    requestDialog.showModal();
    customerName.focus();
  });
});

for (const dialog of [requestDialog, privacyDialog]) {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  // Закрываем только при нажатии и отпускании за пределами окна.
  let outsideStart = false;
  const isOutside = event => {
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  };
  dialog.addEventListener('pointerdown', event => { outsideStart = isOutside(event); });
  dialog.addEventListener('click', event => {
    if (outsideStart && isOutside(event)) dialog.close();
    outsideStart = false;
  });
  dialog.addEventListener('close', () => {
    if (dialog === requestDialog) {
      form.reset();
      error.textContent = '';
    }
    if (activeTrigger) activeTrigger.focus();
  });
}
document.querySelector('#finish-request').addEventListener('click', () => requestDialog.close());
document.querySelector('#privacy-open').addEventListener('click', event => {
  activeTrigger = event.currentTarget;
  privacyDialog.showModal();
});

customerName.addEventListener('input', () => customerName.setCustomValidity(''));
phone.addEventListener('input', () => {
  phone.removeAttribute('aria-invalid');
  error.textContent = '';
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (customerName.value.trim().length < 2) {
    customerName.setCustomValidity('Введите имя: минимум две буквы или символа без пробелов по краям.');
    customerName.reportValidity();
    return;
  }
  const phoneText = phone.value.trim();
  const digits = phoneText.replace(/\D/g, '');
  if (!/^[+\d\s()\-]+$/.test(phoneText) || !/^[78]\d{10}$/.test(digits)) {
    error.textContent = 'Проверьте телефон: нужно 11 цифр, первая — 7 или 8. Например: +7 (999) 123-45-67.';
    phone.setAttribute('aria-invalid', 'true');
    phone.focus();
    return;
  }
  // Локальная демонстрация: никаких сетевых запросов и сохранения данных.
  fields.hidden = true;
  result.hidden = false;
  requestDialog.setAttribute('aria-labelledby', 'result-title');
  document.querySelector('#result-title').focus();
  form.reset();
});

const cards = [...document.querySelectorAll('.unit-card')];
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    cards.forEach(card => {
      card.hidden = selected !== 'all' && card.dataset.size !== selected;
      if (!card.hidden) count++;
    });
    document.querySelector('#catalog-count').textContent = count === 1 ? '1 пример ячейки' : `${count} примера ячеек`;
  });
});
document.querySelector('#year').textContent = new Date().getFullYear();
