/* Чистая логика каталога: используется сайтом и проверками без браузера. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SkladexCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const formatArea = value => Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPrice = value => Number(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
  function filterUnits(units, filters) {
    return units.filter(unit =>
      (!filters.building || filters.building === 'all' || String(unit.building) === filters.building) &&
      (!filters.category || filters.category === 'all' || unit.category === filters.category) &&
      (!filters.section || filters.section === 'all' || String(unit.section) === filters.section) &&
      (!filters.availability || filters.availability === 'all' || unit.status === filters.availability)
    );
  }
  function offerPrice(unit, categories) {
    if (unit.status !== 'available') return null;
    return unit.monthlyOfferPrice ?? categories[unit.category].monthlyPrice;
  }
  function composeMessage(unit, data) {
    if (unit.status !== 'available') return null;
    const address = data.addresses[unit.addressId];
    const price = offerPrice(unit, data.categories);
    const from = data.categories[unit.category].priceFrom ? 'от ' : '';
    return `Здравствуйте! Интересует аренда кладовой №${unit.number}, ${address.street}, ${address.house}, корпус ${unit.building}, секция ${unit.section}, площадь ${formatArea(unit.area)} м², стоимость ${from}${formatPrice(price)} ₽/мес. Хотел бы договориться об осмотре`;
  }
  function telegramLink(message) {
    return `https://t.me/Skladex?text=${encodeURIComponent(message)}`;
  }
  function validateData(data) {
    if (!data || !Array.isArray(data.units) || !data.categories || !data.addresses) throw new Error('Некорректный каталог');
    const ids = new Set();
    for (const unit of data.units) {
      const category = data.categories[unit.category];
      if (!unit.id || ids.has(unit.id) || !data.addresses[unit.addressId] || !category ||
        !['available', 'occupied'].includes(unit.status) || !Number.isFinite(unit.area) ||
        unit.area < category.minArea || unit.area > category.maxArea ||
        !Number.isInteger(unit.building) || !Number.isInteger(unit.section) || !Number.isInteger(unit.number) ||
        !Number.isFinite(offerPrice({ ...unit, status: 'available' }, data.categories))) {
        throw new Error('Проверьте данные кладовой');
      }
      ids.add(unit.id);
    }
    return data;
  }
  return { formatArea, formatPrice, filterUnits, offerPrice, composeMessage, telegramLink, validateData };
});
