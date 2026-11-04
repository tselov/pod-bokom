"use strict";

const core = window.SkladexCatalog;
const config = window.SKLADEX_CONFIG || {};
const metricId = Number(config.metricaCounterId);
const metricActive = config.metricaEnabled === true && Number.isInteger(metricId) && metricId > 0;
if (metricActive) {
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  const metricScript = document.createElement('script');
  metricScript.async = true;
  metricScript.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(metricScript);
  window.ym(metricId, 'init', { clickmap: false, trackLinks: false, accurateTrackBounce: true, webvisor: false });
}
function trackEvent(name, values = {}) {
  // Только свойства каталога. Телефоны клиентов, сообщения и иные ПД сюда не передаются.
  const safe = {};
  for (const key of ['unitId', 'addressId', 'building', 'category', 'section']) {
    if (values[key] !== undefined && values[key] !== null) safe[key] = String(values[key]);
  }
  document.dispatchEvent(new CustomEvent('skladex:analytics', { detail: { name, params: safe } }));
  if (metricActive && typeof window.ym === 'function') window.ym(metricId, 'reachGoal', name, safe);
}
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

const buildings = {
  "1": {
    "address": "г. Тюмень, ул. Республики, 205, корпус 1",
    "heading": "Республики, 205 · корпус 1",
    "longitude": 65.59686,
    "latitude": 57.12774,
    "geoUri": "ymapsbm1://geo?data=Cgo2NTkwNjYyMjQyEkPQoNC-0YHRgdC40Y8sINCi0Y7QvNC10L3RjCwg0YPQu9C40YbQsCDQoNC10YHQv9GD0LHQu9C40LrQuCwgMjA10LoxIgoNlzGDQhXOgmRC",
    "addressId": "republic-205",
    "building": 1,
    "access": "По магнитному ключу",
    "loading": "Через подземный паркинг"
  },
  "2": {
    "address": "г. Тюмень, ул. Республики, 205, корпус 2",
    "heading": "Республики, 205 · корпус 2",
    "longitude": 65.598728,
    "latitude": 57.12798,
    "geoUri": "ymapsbm1://geo?data=Cgo2OTgxNTAwNDIwEkPQoNC-0YHRgdC40Y8sINCi0Y7QvNC10L3RjCwg0YPQu9C40YbQsCDQoNC10YHQv9GD0LHQu9C40LrQuCwgMjA10LoyIgoNjDKDQhUNg2RC",
    "addressId": "republic-205",
    "building": 2,
    "access": "По магнитному ключу",
    "loading": "Через подземный паркинг"
  },
  "masharova-10": {
    "addressId": "masharova-10",
    "building": null,
    "address": "г. Тюмень, ул. Николая Машарова, 10",
    "heading": "Николая Машарова, 10",
    "access": "Уточняется перед арендой",
    "loading": "Маршрут и разгрузку уточните у владельца"
  }
};

let selectedBuilding = '1';
let chosenSection = null;
let selectPlanSection = null;
let refreshPlans = () => {};
const planRegistry = window.SKLADEX_PLANS || {};
const getPlan = (building, section) => planRegistry[String(building)]?.[String(section)] || null;
let catalogData = null;
const filters = { addressId: 'all', building: 'all', category: 'all', section: 'all', availability: 'available' };
const grid = document.querySelector('#units-grid');
const dialog = document.querySelector('#contact-dialog');
const messageField = document.querySelector('#contact-message');
const dialogTelegram = document.querySelector('#unit-telegram');
let contactTrigger = null;
const viewedUnits = new Set();
const unitObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const unit = catalogData?.units.find(item => item.id === entry.target.dataset.unitId);
    if (unit && unit.status === 'available' && !viewedUnits.has(unit.id)) {
      viewedUnits.add(unit.id);
      trackEvent('unit_view', { unitId: unit.id, building: unit.building, category: unit.category });
    }
    unitObserver.unobserve(entry.target);
  });
}, { threshold: 0.35 }) : null;

function buildingAvailability(id) {
  if (!catalogData) return 'Наличие — в каталоге кладовых';
  const location = buildings[id];
  const units = catalogData.units.filter(unit => unit.addressId === location.addressId && (location.building === null || unit.building === location.building));
  const free = units.filter(unit => unit.status === 'available').length;
  const unknown = units.filter(unit => unit.status === 'on_request').length;
  if (free) return `Свободно: ${free} из ${units.length}`;
  if (unknown) return `Наличие уточняется: ${unknown} из ${units.length}`;
  return `Все ${units.length} кладовых заняты`;
}
function unitPosition(unit) {
  return [unit.building === null ? '' : `Корпус ${unit.building}`, unit.section === null ? '' : `Секция ${unit.section}`].filter(Boolean).join(' · ');
}
function showContact(message, title, details, trigger, unitId = '') {
  contactTrigger = trigger;
  document.querySelector('#contact-dialog-eyebrow').textContent = 'ОБРАЩЕНИЕ';
  document.querySelector('#contact-dialog-title').textContent = title;
  document.querySelector('#contact-dialog-details').textContent = details;
  document.querySelector('#contact-copy-status').textContent = '';
  messageField.value = message;
  dialogTelegram.href = core.telegramLink(message);
  dialogTelegram.dataset.unitId = unitId;
  dialog.showModal();
}
function requestUnit(id, trigger) {
  const unit = catalogData?.units.find(item => item.id === id);
  if (!unit || unit.status === 'occupied') return;
  const address = catalogData.addresses[unit.addressId];
  const message = core.composeMessage(unit, catalogData);
  trackEvent(unit.status === 'available' ? 'inspection_click' : 'availability_click', { unitId: unit.id, addressId: unit.addressId, building: unit.building, category: unit.category, section: unit.section });
  showContact(message, `Кладовая №${unit.number}`, `${address.city}, ${address.street}, ${address.house}${unitPosition(unit) ? ' · ' + unitPosition(unit) : ''} · ${core.formatArea(unit.area)} м²`, trigger, unit.id);
  document.querySelector('#contact-dialog-eyebrow').textContent = unit.status === 'available' ? 'ЗАПИСЬ НА ОСМОТР' : 'УТОЧНЕНИЕ НАЛИЧИЯ';
}
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { if (contactTrigger?.isConnected) contactTrigger.focus(); });
document.querySelector('#copy-message').addEventListener('click', async () => {
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(messageField.value); copied = true; }
  } catch { /* Ниже остаётся ручное копирование. */ }
  if (!copied) {
    messageField.focus();
    messageField.select();
    try { copied = !!document.execCommand?.('copy'); } catch { copied = false; }
  }
  document.querySelector('#contact-copy-status').textContent = copied
    ? 'Текст скопирован. Вставьте его в чат @Skladex и отправьте.'
    : 'Выделите текст и скопируйте его вручную, затем отправьте в Telegram @Skladex.';
});
document.querySelectorAll('[data-request]').forEach(button => {
  button.addEventListener('click', () => {
    const building = button.dataset.building || selectedBuilding;
    const section = button.dataset.section;
    const detail = buildings[building].address + (section ? ` · Секция ${section}` : '');
    showContact(`Здравствуйте! Интересует аренда кладовой: ${buildings[building].address}${section ? `, секция ${section}` : ''}. Подскажите доступные варианты и помогите договориться об осмотре.`, 'Подберём кладовую', detail, button);
  });
});
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  if (link.hasAttribute('data-phone')) trackEvent('phone_click');
  if (link.hasAttribute('data-telegram') || link.id === 'unit-telegram') {
    trackEvent('telegram_click', link.dataset.unitId ? { unitId: link.dataset.unitId } : {});
  }
});

function safeImagePath(path) {
  if (typeof path !== 'string') return null;
  // Фотографии храним в репозитории: URL, скрипты и выход за корень не разрешены.
  return /^(?:images|photos)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif)$/i.test(path) && !path.includes('..') ? path : null;
}
function makeUnitCard(unit) {
  const free = unit.status === 'available';
  const unknown = unit.status === 'on_request';
  const actionable = free || unknown;
  const card = document.createElement('article');
  card.className = `unit-card${free ? '' : ' unit-occupied'}`;
  card.dataset.unitId = unit.id;
  card.setAttribute('aria-labelledby', `title-${unit.id}`);
  card.innerHTML = `<div class="unit-media"><span class="unit-pictogram" aria-hidden="true"><svg viewBox="0 0 160 120" fill="none"><rect x="25" y="39" width="76" height="58" rx="7" fill="#D7E1EC" stroke="#071E3A" stroke-width="2"/><path d="M47 39v-9h32v9M43 50v35M84 50v35" stroke="#071E3A" stroke-width="3"/><path d="m95 61 32-11 24 14v32l-32 11-24-14V61Z" fill="#FFD5BC" stroke="#071E3A" stroke-width="2"/><path d="m95 61 24 14 32-11M119 75v32M107 57l25 14" stroke="#071E3A" stroke-width="2"/></svg></span><span class="unit-status"></span></div><div class="unit-copy"><p class="unit-category"></p><h3></h3><p class="unit-address"></p><p class="unit-position"></p><dl class="unit-specs"><div><dt>Площадь</dt><dd></dd></div></dl><div class="unit-price"></div><button class="button unit-inspect" type="button"></button><a class="unit-chat text-link" target="_blank" rel="noopener noreferrer">Написать об этой кладовой</a><div class="unit-plan"></div></div>`;
  const q = selector => card.querySelector(selector);
  const address = catalogData.addresses[unit.addressId];
  const heading = q('h3');
  heading.id = `title-${unit.id}`;
  heading.textContent = `Кладовая №${unit.number}`;
  q('.unit-status').textContent = free ? 'Свободна' : unknown ? 'Наличие уточняется' : 'Занята';
  q('.unit-status').classList.toggle('available', free);
  q('.unit-category').textContent = catalogData.categories[unit.category].name;
  q('.unit-address').textContent = `${address.city}, ${address.street}, ${address.house}`;
  q('.unit-position').textContent = unitPosition(unit) || 'Расположение уточните у владельца';
  q('dd').textContent = `${core.formatArea(unit.area)} м²`;
  const price = core.offerPrice(unit, catalogData.categories);
  q('.unit-price').textContent = free ? `${catalogData.categories[unit.category].priceFrom ? 'от ' : ''}${core.formatPrice(price)} ₽/мес.` : unknown ? 'Цена и наличие — по запросу' : 'Помещение занято';
  const button = q('.unit-inspect');
  button.textContent = unknown ? 'Уточнить наличие' : 'Записаться на осмотр';
  button.setAttribute('aria-label', `${unknown ? 'Уточнить наличие' : 'Записаться на осмотр'} кладовой №${unit.number}, ${address.street}, ${address.house}${unitPosition(unit) ? ', ' + unitPosition(unit) : ''}`);
  button.disabled = !actionable;
  button.classList.add(free ? 'button-primary' : 'button-outline');
  button.addEventListener('click', () => requestUnit(unit.id, button));
  const link = q('.unit-chat');
  link.hidden = !actionable;
  if (actionable) { link.href = core.telegramLink(core.composeMessage(unit, catalogData)); link.dataset.telegram = ''; link.dataset.unitId = unit.id; }
  const plan = q('.unit-plan');
  if (unit.addressId === 'republic-205' && getPlan(unit.building, unit.section)) {
    const planButton = document.createElement('button');
    planButton.type = 'button';
    planButton.className = 'text-link';
    planButton.textContent = `Схема секции ${unit.section} ↗`;
    planButton.addEventListener('click', () => {
      setBuilding(String(unit.building));
      if (selectPlanSection) selectPlanSection(String(unit.section));
      scrollTo(document.querySelector('#floorplan-panel'));
    });
    plan.append(planButton);
  } else {
    plan.textContent = unit.plan ? 'Схема уточняется у владельца' : 'Схема пока не опубликована';
    if (unit.addressId === 'masharova-10') {
      const addressLink = document.createElement('a');
      addressLink.className = 'text-link unit-map'; addressLink.href = '#location'; addressLink.textContent = 'Посмотреть расположение';
      addressLink.addEventListener('click', () => setBuilding('masharova-10'));
      plan.append(addressLink);
    }
  }
  const photo = safeImagePath(unit.photo);
  if (photo) {
    const image = document.createElement('img');
    image.src = photo; image.alt = `Кладовая №${unit.number}, ${address.street}, ${address.house}`; image.loading = 'lazy'; image.width = 640; image.height = 400;
    const icon = q('.unit-pictogram');
    icon.hidden = true;
    q('.unit-media').prepend(image);
    image.addEventListener('error', () => { image.remove(); icon.hidden = false; });
  }
  return card;
}
function renderCatalog() {
  if (!catalogData) return;
  unitObserver?.disconnect();
  const matches = core.filterUnits(catalogData.units, filters);
  grid.replaceChildren(...matches.map(makeUnitCard));
  grid.setAttribute('aria-busy', 'false');
  document.querySelector('#catalog-count').textContent = `Найдено: ${matches.length} из ${catalogData.units.length}`;
  document.querySelector('#catalog-empty').hidden = matches.length !== 0;
  document.querySelector('#show-all-units').checked = filters.availability === 'all';
  const address = catalogData.addresses[filters.addressId];
  const title = filters.availability === 'available' ? 'Свободные кладовые' : 'Кладовые';
  document.querySelector('#catalog-title').textContent = title + (address ? `: ${address.street}, ${address.house}` : ' в Тюмени');
  if (unitObserver) grid.querySelectorAll('.unit-card:not(.unit-occupied)').forEach(card => unitObserver.observe(card));
}
function resetFilters() {
  Object.assign(filters, { addressId: 'all', building: 'all', category: 'all', section: 'all', availability: 'available' });
  for (const [key, value] of Object.entries(filters)) document.querySelector(`#filter-${key}`).value = value;
  updateAddressFilters();
  renderCatalog();
}
function updateAddressFilters() {
  if (!catalogData) return;
  const units = catalogData.units.filter(unit => filters.addressId === 'all' || unit.addressId === filters.addressId);
  for (const key of ['building', 'section']) {
    const select = document.querySelector(`#filter-${key}`);
    const values = [...new Set(units.map(unit => unit[key]).filter(value => value !== null))].sort((a,b) => a-b);
    select.replaceChildren(new Option(key === 'building' ? 'Все корпуса' : 'Все секции', 'all'), ...values.map(value => new Option(`${key === 'building' ? 'Корпус' : 'Секция'} ${value}`, String(value))));
    if (!values.map(String).includes(filters[key])) filters[key] = 'all';
    select.value = filters[key];
    select.disabled = values.length === 0;
  }
}
for (const name of Object.keys(filters)) {
  document.querySelector(`#filter-${name}`).addEventListener('change', event => {
    filters[name] = event.target.value;
    if (name === 'addressId') { updateAddressFilters(); trackEvent('address_select', { addressId: filters.addressId }); }
    if (name === 'building') trackEvent('building_select', { building: filters.building });
    if (name === 'category') trackEvent('category_select', { category: filters.category });
    renderCatalog();
  });
}
document.querySelector('#show-all-units').addEventListener('change', event => {
  filters.availability = event.target.checked ? 'all' : 'available';
  document.querySelector('#filter-availability').value = filters.availability;
  renderCatalog();
});
document.querySelector('#reset-filters').addEventListener('click', resetFilters);
document.querySelector('#empty-reset').addEventListener('click', resetFilters);
document.querySelectorAll('[data-category-choice]').forEach(link => link.addEventListener('click', () => {
  resetFilters();
  filters.category = link.dataset.categoryChoice;
  document.querySelector('#filter-category').value = filters.category;
  trackEvent('category_select', { category: filters.category });
  renderCatalog();
}));
async function loadCatalog() {
  grid.setAttribute('aria-busy', 'true');
  document.querySelector('#catalog-error').hidden = true;
  document.querySelector('#catalog-count').textContent = 'Загружаем кладовые…';
  try {
    const response = await fetch('units.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Каталог недоступен');
    catalogData = core.validateData(await response.json());
    const addressSelect = document.querySelector('#filter-addressId');
    addressSelect.replaceChildren(new Option('Все адреса', 'all'), ...Object.entries(catalogData.addresses).map(([id, address]) => new Option(`${address.street}, ${address.house}`, id)));
    addressSelect.value = filters.addressId;
    updateAddressFilters();
    const categorySelect = document.querySelector('#filter-category');
    categorySelect.replaceChildren(new Option('Все категории', 'all'), ...Object.entries(catalogData.categories).map(([id, category]) => new Option(category.name, id)));
    categorySelect.value = filters.category;
    document.querySelector('#catalog-updated').textContent = `Данные на ${new Date(catalogData.updatedAt + 'T12:00:00Z').toLocaleDateString('ru-RU')}`;
    document.querySelector('#building-availability').textContent = buildingAvailability(selectedBuilding);
    renderCatalog();
  } catch {
    catalogData = null;
    grid.replaceChildren();
    grid.setAttribute('aria-busy', 'false');
    document.querySelector('#catalog-count').textContent = 'Каталог временно недоступен';
    document.querySelector('#catalog-empty').hidden = true;
    document.querySelector('#catalog-error').hidden = false;
  }
}
document.querySelector('#catalog-retry').addEventListener('click', loadCatalog);

const mapFrame = document.querySelector('#location-map');
const mapStatus = document.querySelector('#map-status');
let mappedBuilding = null;
let mapLoadingTimer = null;
function loadLocationMap(id, force = false) {
  const building = buildings[id];
  if (!building) return;
  const query = building.geoUri
    ? new URLSearchParams({mode: 'search', ol: 'geo', ouri: building.geoUri, ll: `${building.longitude},${building.latitude}`, z: '17'})
    : new URLSearchParams({mode: 'search', text: building.address, z: '17'});
  document.querySelector('#map-external').href = `https://yandex.ru/maps/?${query}`;
  const destination = building.latitude ? `${building.latitude},${building.longitude}` : building.address;
  document.querySelector('#map-route').href = `https://yandex.ru/maps/?${new URLSearchParams({rtext: `~${destination}`, rtt: 'auto'})}`;
  document.querySelector('#map-backup').href = `https://2gis.ru/tyumen/search/${encodeURIComponent(building.address)}`;
  if (mappedBuilding === id && !force) return;
  mappedBuilding = id;
  clearTimeout(mapLoadingTimer);
  mapStatus.hidden = false;
  mapStatus.textContent = `Загружаем карту: ${building.heading}…`;
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
  document.querySelector('#location-access').textContent = building.access;
  document.querySelector('#location-loading').textContent = building.loading;
  document.querySelector('#building-photo').hidden = building.addressId !== 'republic-205';
  refreshPlans(id);
  loadLocationMap(id);
  const hasPlans = Object.keys(planRegistry[id] || {}).length > 0;
  const plansNotice = document.querySelector('#plans-unavailable');
  plansNotice.hidden = hasPlans;
  plansNotice.textContent = building.addressId === 'republic-205' ? `Схемы корпуса ${id} пока не опубликованы.` : 'Схемы кладовых на Николая Машарова, 10 пока не предоставлены.';
  document.querySelector('#building-availability').textContent = buildingAvailability(id);
  trackEvent('building_select', { addressId: building.addressId, building: building.building });
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
document.querySelectorAll('a[href="#floorplan-panel"]').forEach(link => link.addEventListener('click', () => {
  if (!Object.keys(planRegistry[selectedBuilding] || {}).length) setBuilding('1');
}));

if (document.querySelector('#floorplan-panel')) {
// Каждый план принадлежит конкретным корпусу и секции. Изображения не перерисовываются.
let activeSection = '1';
const selectedSections = {};
function selectSection(id) {
  const plan = getPlan(selectedBuilding, id);
  if (!plan) return;
  activeSection = String(id);
  selectedSections[selectedBuilding] = activeSection;
  chosenSection = activeSection;
  document.querySelectorAll('[data-section-choice]').forEach(button => {
    const active = button.dataset.sectionChoice === activeSection;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const heading = `Республики, 205, корпус ${selectedBuilding} · Секция ${id}`;
  document.querySelector('#floorplan-heading').textContent = heading;
  const preview = document.querySelector('#floorplan-preview');
  preview.width = plan.width;
  preview.height = plan.height;
  preview.alt = `Схема расположения кладовых: ${heading}`;
  document.querySelector('#floorplan-error').hidden = true;
  preview.src = plan.src;
  document.querySelector('#floorplan-file').href = plan.src;
  document.querySelector('#floorplan-caption').textContent = `Корпус ${selectedBuilding}, секция ${id}. Наличие кладовых смотрите в каталоге.`;
  const request = document.querySelector('#section-request');
  request.dataset.building = selectedBuilding;
  request.dataset.section = String(id);
  document.querySelectorAll('[data-plan-open]').forEach(button => {
    button.disabled = false;
    button.setAttribute('aria-label', `Увеличить схему: корпус ${selectedBuilding}, секция ${id}`);
  });
}
selectPlanSection = selectSection;
refreshPlans = id => {
  const sections = Object.keys(planRegistry[id] || {}).sort((a,b) => Number(a)-Number(b));
  const panel = document.querySelector('#floorplan-panel');
  panel.hidden = sections.length === 0;
  if (!sections.length) return;
  document.querySelector('#plans-eyebrow').textContent = `РЕСПУБЛИКИ, 205 / КОРПУС ${id} / СХЕМ: ${sections.length}`;
  document.querySelector('#plans-description').textContent = id === '2'
    ? 'Выберите секцию. Доступны схемы секций 1, 2, 3, 4, 6, 7 и 8.'
    : 'Выберите одну из десяти секций и рассмотрите её схему.';
  const picker = document.querySelector('#section-picker');
  picker.setAttribute('aria-label', `Секции корпуса ${id}`);
  picker.replaceChildren(...sections.map(section => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'section-button';
    button.dataset.sectionChoice = section;
    button.textContent = section;
    button.setAttribute('aria-label', `Секция ${section}, корпус ${id}`);
    button.setAttribute('aria-controls', 'floorplan-stage floorplan-heading');
    button.addEventListener('click', () => selectSection(section));
    return button;
  }));
  selectSection(sections.includes(selectedSections[id]) ? selectedSections[id] : sections[0]);
};

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
    const plan = getPlan(selectedBuilding, activeSection);
    if (!plan) return;
    const image = document.querySelector('#plan-image');
    image.src = plan.src;
    image.alt = `Схема кладовых секции ${activeSection}, корпус ${selectedBuilding}`;
    image.width = plan.width;
    image.height = plan.height;
    document.querySelector('#plan-dialog-title').textContent = `Корпус ${selectedBuilding} · Секция ${activeSection}`;
    document.querySelector('#plan-dialog-building').textContent = `РЕСПУБЛИКИ, 205, КОРПУС ${selectedBuilding}`;
    document.querySelector('#plan-download').href = plan.src;
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
document.querySelector('#year').textContent = new Date().getFullYear();
loadCatalog();
