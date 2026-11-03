"use strict";

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollTo = element => element.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'start' });
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
function closeMenu() {
  mobileMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  mobileMenu.hidden = open;
  menuToggle.setAttribute('aria-expanded', String(!open));
  menuToggle.setAttribute('aria-label', open ? 'Открыть меню' : 'Закрыть меню');
});
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileMenu.hidden) { closeMenu(); menuToggle.focus(); }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const slides = [...document.querySelectorAll('[data-slide]')];
let activeSlide = 0;
function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => { slide.hidden = i !== activeSlide; });
  document.querySelector('#hero-count').textContent = `${String(activeSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
}
document.querySelector('#slide-prev').addEventListener('click', () => showSlide(activeSlide - 1));
document.querySelector('#slide-next').addEventListener('click', () => showSlide(activeSlide + 1));

const areaCards = [...document.querySelectorAll('.area-card')];
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    areaCards.forEach(card => {
      card.hidden = button.dataset.filter !== 'all' && card.dataset.format !== button.dataset.filter;
      if (!card.hidden) count++;
    });
    document.querySelector('#format-count').textContent = count === 1 ? 'Показан 1 формат' : `Показано ${count} формата`;
  });
});

const buildings = {
  "1": {
    "address": "г. Тюмень, ул. Республики, 205, корпус 1",
    "heading": "Республики, 205 · корпус 1",
    "longitude": 65.59686,
    "latitude": 57.12774,
    "geoUri": "ymapsbm1://geo?data=Cgo2NTkwNjYyMjQyEkPQoNC-0YHRgdC40Y8sINCi0Y7QvNC10L3RjCwg0YPQu9C40YbQsCDQoNC10YHQv9GD0LHQu9C40LrQuCwgMjA10LoxIgoNlzGDQhXOgmRC"
  },
  "2": {
    "address": "г. Тюмень, ул. Республики, 205, корпус 2",
    "heading": "Республики, 205 · корпус 2",
    "longitude": 65.598728,
    "latitude": 57.12798,
    "geoUri": "ymapsbm1://geo?data=Cgo2OTgxNTAwNDIwEkPQoNC-0YHRgdC40Y8sINCi0Y7QvNC10L3RjCwg0YPQu9C40YbQsCDQoNC10YHQv9GD0LHQu9C40LrQuCwgMjA10LoyIgoNjDKDQhUNg2RC"
  }
};
let selectedBuilding = '1';
let chosenSection = null;
const areaSelect = document.querySelector('#inquiry-area');
const itemsInput = document.querySelector('#inquiry-items');
const inquiryResult = document.querySelector('#inquiry-result');
const inquiryMessage = document.querySelector('#inquiry-message');
const copyStatus = document.querySelector('#copy-status');
const areaNames = {
  help: 'Помогите подобрать подходящую площадь',
  compact: 'Компактная · 2–4 м²',
  universal: 'Универсальная · 4–5 м²',
  spacious: 'Просторная · 5–7 м²'
};
function invalidateInquiry() { inquiryResult.hidden = true; copyStatus.textContent = ''; }
function updateInquiryContext() {
  const address = buildings[selectedBuilding].address;
  document.querySelector('#inquiry-context').textContent = address + (selectedBuilding === '1' && chosenSection ? ` · Секция ${chosenSection}` : '');
  invalidateInquiry();
}
areaSelect.addEventListener('change', invalidateInquiry);
itemsInput.addEventListener('input', invalidateInquiry);
function composeInquiry() {
  const lines = ['Здравствуйте! Интересует аренда индивидуальной кладовой СКЛАДЭКС.', `Адрес: ${buildings[selectedBuilding].address}.`];
  if (selectedBuilding === '1' && chosenSection) lines.push(`Секция: ${chosenSection}.`);
  lines.push(`Площадь: ${areaNames[areaSelect.value] || areaNames.help}.`);
  const items = itemsInput.value.trim();
  if (items) lines.push(`Планирую хранить: ${items}`);
  lines.push('Подскажите свободные варианты, точную площадь, актуальную стоимость и когда можно посмотреть помещение.');
  return lines.join('\n');
}
document.querySelector('#inquiry-form').addEventListener('submit', event => event.preventDefault());
const copyButton = document.querySelector('#copy-inquiry');
copyButton.disabled = false;
copyButton.addEventListener('click', async event => {
  event.preventDefault();
  const text = composeInquiry();
  inquiryMessage.value = text;
  inquiryResult.hidden = false;
  let copied = false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch { /* При запрете буфера оставляем текст для ручного копирования. */ }
  if (!copied) {
    inquiryMessage.focus();
    inquiryMessage.select();
    try { copied = typeof document.execCommand === 'function' && document.execCommand('copy'); } catch { copied = false; }
  }
  copyStatus.textContent = copied
    ? 'Текст скопирован. Отправьте его владельцу удобным способом. Сайт ничего не отправлял.'
    : 'Обращение готово. Выделите текст и скопируйте его вручную: Ctrl+C на компьютере или «Копировать» на телефоне. Сайт ничего не отправлял.';
});
document.querySelectorAll('[data-inquiry], [data-request]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.building) setBuilding(button.dataset.building);
    if (button.dataset.section) chosenSection = button.dataset.section;
    if (button.dataset.area && areaNames[button.dataset.area]) areaSelect.value = button.dataset.area;
    updateInquiryContext();
    scrollTo(document.querySelector('#inquiry'));
    areaSelect.focus({ preventScroll: true });
  });
});

const mapFrame = document.querySelector('#location-map');
const mapStatus = document.querySelector('#map-status');
let mappedBuilding = null;
let mapLoadingTimer = null;
function loadLocationMap(id, force = false) {
  const building = buildings[id];
  if (!building) return;
  const center = `${building.longitude},${building.latitude}`;
  const query = new URLSearchParams({mode: 'search', ol: 'geo', ouri: building.geoUri, ll: center, z: '17'});
  document.querySelector('#map-external').href = `https://yandex.ru/maps/?${query}`;
  document.querySelector('#map-route').href = `https://yandex.ru/maps/?rtext=~${building.latitude},${building.longitude}&rtt=auto`;
  document.querySelector('#map-backup').href = `https://2gis.ru/tyumen/search/${encodeURIComponent(building.address)}`;
  if (mappedBuilding === id && !force) return;
  mappedBuilding = id;
  clearTimeout(mapLoadingTimer);
  mapStatus.hidden = false;
  mapStatus.textContent = `Загружаем карту корпуса ${id}…`;
  mapFrame.title = `Карта: ${building.address}`;
  mapFrame.src = `https://yandex.ru/map-widget/v1/?${query}`;
  // У iframe другой домен: событие load подтверждает загрузку документа, но не карты внутри него.
  // Ссылки на адрес и маршрут доступны независимо от загрузки внешнего виджета.
  mapLoadingTimer = setTimeout(() => {
    mapStatus.hidden = false;
    mapStatus.textContent = 'Карта загружается дольше обычного. Можно открыть адрес в Яндекс Картах или 2ГИС.';
  }, 12000);
}
mapFrame.addEventListener('load', () => {
  clearTimeout(mapLoadingTimer);
  mapStatus.hidden = true;
});
mapFrame.addEventListener('error', () => {
  clearTimeout(mapLoadingTimer);
  mapStatus.hidden = false;
  mapStatus.textContent = 'Не удалось загрузить карту. Обновите её или откройте адрес по ссылке.';
});
document.querySelector('#map-retry').addEventListener('click', () => loadLocationMap(mappedBuilding || '1', true));

function setBuilding(id) {
  const building = buildings[id];
  if (!building) return;
  if (selectedBuilding !== id) chosenSection = null;
  selectedBuilding = id;
  document.querySelectorAll('[data-building-choice]').forEach(button => {
    const active = button.dataset.buildingChoice === id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#building-heading').textContent = building.heading;
  document.querySelector('#building-address').textContent = building.address;
  document.querySelector('#building-request').dataset.building = id;
  const panel = document.querySelector('#floorplan-panel');
  if (panel) panel.hidden = id !== '1';
  loadLocationMap(id);
  updateInquiryContext();
}
document.querySelectorAll('[data-building-choice]').forEach(button => {
  if (button.hasAttribute('data-photo-choice')) {
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.dispatchEvent(new Event('click', { bubbles: true })); }
    });
  }
  button.addEventListener('click', () => {
    setBuilding(button.dataset.buildingChoice);
    if (button.hasAttribute('data-photo-choice')) scrollTo(document.querySelector('.location-grid'));
  });
});
document.querySelectorAll('a[href="#floorplan-panel"]').forEach(link => link.addEventListener('click', () => setBuilding('1')));

if (document.querySelector('#floorplan-panel')) {
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
  chosenSection = id;
  updateInquiryContext();
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
  document.querySelector('#floorplan-error').hidden = true;
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

// При сетевой ошибке оставляем пользователю ссылку на оригинальную схему.
document.querySelector('#floorplan-preview').addEventListener('error', () => {
  document.querySelector('#floorplan-error').hidden = false;
});
document.querySelector('#floorplan-preview').addEventListener('load', () => {
  document.querySelector('#floorplan-error').hidden = true;
});

}
setBuilding('1');
showSlide(0);
document.querySelector('#year').textContent = new Date().getFullYear();
