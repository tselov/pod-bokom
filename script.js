'use strict';

// Примеры: замените значениями реальных свободных кладовых вместе с HTML-карточками.
const units = {
  '01': 'Кладовая 01 · 1 м² · 1 500 ₽/мес (пример)',
  '02': 'Кладовая 02 · 2 м² · 2 500 ₽/мес (пример)',
  '03': 'Кладовая 03 · 3 м² · 3 500 ₽/мес (пример)'
};
const requestDialog = document.querySelector('#request-dialog');
const privacyDialog = document.querySelector('#privacy-dialog');
const form = document.querySelector('#request-form');
const fields = document.querySelector('#request-fields');
const result = document.querySelector('#request-result');
const phone = document.querySelector('#customer-phone');
const customerName = document.querySelector('#customer-name');
const error = document.querySelector('#form-error');
const customerBuilding = document.querySelector('#customer-building');
const customerSection = document.querySelector('#customer-section');
const customerSectionField = document.querySelector('#customer-section-field');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
let activeTrigger = null;
let requestedUnitDescription = '';

function updateRequestSummary() {
  const parts = [];
  if (customerBuilding.value) parts.push(`Корпус ${customerBuilding.value}`);
  if (customerBuilding.value === '1' && customerSection.value) parts.push(`Секция ${customerSection.value}`);
  parts.push(requestedUnitDescription || 'Подбор кладовой');
  document.querySelector('#selection').textContent = parts.join(' · ');
}

function syncRequestSection() {
  const supported = customerBuilding.value === '1';
  customerSectionField.hidden = !supported;
  customerSection.disabled = !supported;
  if (!supported) customerSection.value = '';
}
customerBuilding.addEventListener('change', () => {
  syncRequestSection();
  updateRequestSummary();
});
customerSection.addEventListener('change', updateRequestSummary);

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
    requestedUnitDescription = units[button.dataset.unit] || '';
    form.reset();
    customerBuilding.value = button.dataset.building || '';
    syncRequestSection();
    customerSection.value = customerBuilding.value === '1' ? button.dataset.section || '' : '';
    updateRequestSummary();
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
    document.querySelector('#catalog-count').textContent = count === 1 ? '1 пример кладовой' : `${count} примера кладовых`;
  });
});
document.querySelector('#year').textContent = new Date().getFullYear();

// Владелец подтвердил: метка 1 на иллюстрации — корпус 1, метка 2 — корпус 2.
// В корпусе 1 — десять секций; оригинальные SVG предоставлены владельцем.
const buildings = {
  '1': { address: 'г. Тюмень, ул. Республики, 205, корпус 1', heading: 'Республики, 205 · корпус 1' },
  '2': { address: 'г. Тюмень, ул. Республики, 205, корпус 2', heading: 'Республики, 205 · корпус 2' }
};
document.querySelectorAll('[data-building-choice]').forEach(button => {
  if (button.hasAttribute('data-photo-choice')) {
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.dispatchEvent(new Event('click', { bubbles: true }));
      }
    });
  }
  button.addEventListener('click', () => {
    const id = button.dataset.buildingChoice;
    const building = buildings[id];
    if (!building) return;
    document.querySelectorAll('[data-building-choice]').forEach(choice => {
      const active = choice.dataset.buildingChoice === id;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#building-heading').textContent = building.heading;
    document.querySelector('#building-address').textContent = building.address;
    const query = encodeURIComponent(building.address);
    const map = document.querySelector('#location-map');
    map.title = `Карта: ${building.address}`;
    map.src = `https://yandex.ru/map-widget/v1/?mode=search&text=${query}&z=17`;
    document.querySelector('#map-external').href = `https://yandex.ru/maps/?text=${query}`;
    document.querySelector('#building-request').dataset.building = id;
    document.querySelector('#floorplan-panel').hidden = id !== '1';
    if (button.hasAttribute('data-photo-choice')) {
      document.querySelector('.location-grid').scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start'
      });
    }
  });
});

// Файлы отображаются как изображения; исходные номера и векторные линии не меняются.
const sectionPlans = {
  '1': { width: 3410, height: 3458 },
  '2': { width: 2375, height: 3451 },
  '3': { width: 3411, height: 3436 },
  '4': { width: 3663, height: 1426 },
  '5': { width: 4315, height: 1426 },
  '6': { width: 3351, height: 3405 },
  '7': { width: 2375, height: 2744 },
  '8': { width: 2390, height: 3428 },
  '9': { width: 3721, height: 1424 },
  '10': { width: 4315, height: 1424 }
};
let activeSection = '1';
const sectionSource = id => `floorplans/republic_205-1-${id}.svg`;
function selectSection(id) {
  const plan = sectionPlans[id];
  if (!plan) return;
  activeSection = id;
  document.querySelectorAll('[data-section-choice]').forEach(button => {
    const active = button.dataset.sectionChoice === id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#floorplan-heading').textContent = `Республики, 205, корпус 1 · Секция ${id}`;
  const preview = document.querySelector('#floorplan-preview');
  preview.width = plan.width;
  preview.height = plan.height;
  preview.alt = `Схема расположения кладовых в секции ${id}, Республики, 205, корпус 1`;
  preview.src = sectionSource(id);
  document.querySelector('#floorplan-file').href = sectionSource(id);
  document.querySelector('#floorplan-caption').textContent = `Схема секции ${id} предоставлена владельцем. Номера и расположение сохранены. Выбор секции не создаёт бронь.`;
  document.querySelector('#section-request').dataset.section = id;
  document.querySelectorAll('[data-plan-open]').forEach(button => button.setAttribute('aria-label', `Увеличить схему секции ${id}`));
}

document.querySelectorAll('[data-section-choice]').forEach(button => {
  button.addEventListener('click', () => selectSection(button.dataset.sectionChoice));
});

const planDialog = document.querySelector('#plan-dialog');
const planViewport = document.querySelector('#plan-viewport');
const planCanvas = document.querySelector('#plan-canvas');
const zoomOut = document.querySelector('#plan-zoom-out');
const zoomIn = document.querySelector('#plan-zoom-in');
let planZoom = 1;
let planTrigger = null;
function setPlanZoom(next) {
  const previous = planZoom;
  planZoom = Math.max(1, Math.min(4, next));
  const scale = planZoom / previous;
  const left = (planViewport.scrollLeft + planViewport.clientWidth / 2) * scale - planViewport.clientWidth / 2;
  const top = (planViewport.scrollTop + planViewport.clientHeight / 2) * scale - planViewport.clientHeight / 2;
  planCanvas.style.width = `${planZoom * 100}%`;
  planCanvas.style.height = `${planZoom * 100}%`;
  document.querySelector('#plan-zoom-level').textContent = `${Math.round(planZoom * 100)}%`;
  zoomOut.disabled = planZoom === 1;
  zoomIn.disabled = planZoom === 4;
  planViewport.scrollLeft = planZoom === 1 ? 0 : Math.max(0, left);
  planViewport.scrollTop = planZoom === 1 ? 0 : Math.max(0, top);
}
document.querySelectorAll('[data-plan-open]').forEach(button => {
  button.addEventListener('click', () => {
    planTrigger = button;
    const plan = sectionPlans[activeSection];
    const image = document.querySelector('#plan-image');
    image.src = sectionSource(activeSection);
    image.alt = `Схема кладовых секции ${activeSection}, корпус 1`;
    image.width = plan.width;
    image.height = plan.height;
    document.querySelector('#plan-dialog-title').textContent = `Секция ${activeSection} · Схема кладовых`;
    document.querySelector('#plan-download').href = sectionSource(activeSection);
    planDialog.showModal();
    setPlanZoom(1);
  });
});
zoomIn.addEventListener('click', () => setPlanZoom(planZoom + 0.5));
zoomOut.addEventListener('click', () => setPlanZoom(planZoom - 0.5));
document.querySelector('#plan-fit').addEventListener('click', () => setPlanZoom(1));
planDialog.querySelector('.dialog-close').addEventListener('click', () => planDialog.close());
planDialog.addEventListener('close', () => {
  if (planTrigger) planTrigger.focus();
});
