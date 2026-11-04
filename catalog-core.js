/* Чистая логика каталога: используется сайтом и проверками без браузера. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SkladexCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const formatArea = value => Number.isFinite(value) ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Уточняется';
  const formatPrice = value => Number(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
  function filterUnits(units, filters) {
    return units.filter(unit =>
      (!filters.addressId || filters.addressId === 'all' || unit.addressId === filters.addressId) &&
      (!filters.building || filters.building === 'all' || String(unit.building) === filters.building) &&
      (!filters.category || filters.category === 'all' || unit.category === filters.category) &&
      (!filters.section || filters.section === 'all' || String(unit.section) === filters.section) &&
      (!filters.availability || filters.availability === 'all' || unit.status === filters.availability)
    );
  }
  function offerPrice(unit, categories) {
    if (unit.status !== 'available') return null;
    return unit.monthlyOfferPrice ?? categories[unit.category]?.monthlyPrice ?? null;
  }
  function composeMessage(unit, data) {
    if (unit.status === 'occupied') return null;
    const address = data.addresses[unit.addressId];
    const location = `${address.street}, ${address.house}` +
      (unit.building === null ? '' : `, корпус ${unit.building}`) +
      (unit.section === null ? '' : `, секция ${unit.section}`);
    const area = unit.area === null ? '' : `, площадь ${formatArea(unit.area)} м²`;
    if (unit.status === 'on_request') {
      return `Здравствуйте! Подскажите, свободна ли кладовая №${unit.number}, ${location}${area}? Интересуют стоимость аренды и возможность осмотра`;
    }
    const price = offerPrice(unit, data.categories);
    const from = data.categories[unit.category]?.priceFrom ? 'от ' : '';
    const priceText = price === null ? '' : `, стоимость ${from}${formatPrice(price)} ₽/мес`;
    const missingDetails = [unit.area === null ? 'площадь' : '', price === null ? 'стоимость аренды' : ''].filter(Boolean);
    const clarification = missingDetails.length ? ` Подскажите ${missingDetails.join(' и ')}.` : '';
    return `Здравствуйте! Интересует аренда кладовой №${unit.number}, ${location}${area}${priceText}.${clarification} Хотел бы договориться об осмотре`;
  }
  function telegramLink(message) {
    return `https://t.me/Skladex?text=${encodeURIComponent(message)}`;
  }
  function validateData(data) {
    if (!data || !Array.isArray(data.units) || !data.categories || !data.addresses) throw new Error('Некорректный каталог');
    const ids = new Set();
    for (const unit of data.units) {
      const category = data.categories[unit.category];
      const validArea = unit.area === null ? unit.category === null :
        Number.isFinite(unit.area) && category && unit.area >= category.minArea && unit.area <= category.maxArea;
      const price = offerPrice({ ...unit, status: 'available' }, data.categories);
      const validPrice = price === null ? unit.category === null && unit.monthlyOfferPrice === null : Number.isFinite(price) && price > 0;
      if (!unit.id || ids.has(unit.id) || !data.addresses[unit.addressId] || !validArea ||
        !['available', 'occupied', 'on_request'].includes(unit.status) ||
        !(unit.building === null || Number.isInteger(unit.building)) ||
        !(unit.section === null || Number.isInteger(unit.section)) || !Number.isInteger(unit.number) ||
        !validPrice) {
        throw new Error('Проверьте данные кладовой');
      }
      ids.add(unit.id);
    }
    return data;
  }
  return { formatArea, formatPrice, filterUnits, offerPrice, composeMessage, telegramLink, validateData };
});
