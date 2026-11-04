const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../catalog-core.js');
const plans = require('../plans-data.js');
const root = path.resolve(__dirname, '..');
const allData = JSON.parse(fs.readFileSync(path.join(root, 'units.json'), 'utf8'));
const data = { ...allData, units: allData.units.filter(unit => unit.addressId === 'republic-205') };
const defaults = { building: 'all', category: 'all', section: 'all', availability: 'available' };
const find = change => core.filterUnits(data.units, { ...defaults, ...change });

test('Точный состав каталога, площади и тарифы по ТЗ', () => {
  core.validateData(data);
  assert.equal(data.units.length, 14);
  assert.equal(new Set(data.units.map(u => u.id)).size, 14);
  assert.equal(data.units.reduce((sum, u) => sum + Math.round(u.area * 100), 0), 3497);
  assert.deepEqual(find({}).map(u => [u.building, u.number, u.section, Math.round(u.area * 100)]), [[2, 92, 3, 210], [2, 94, 3, 213], [2, 131, 4, 236]]);
  assert.equal(find({}).reduce((sum, u) => sum + Math.round(u.area * 100), 0), 659);
  assert.equal(find({ availability: 'occupied' }).length, 11);
  assert.equal(find({ category: 'compact', availability: 'all' }).length, 12);
  assert.equal(find({ category: 'universal', availability: 'all' }).length, 2);
  assert.equal(find({ category: 'spacious', availability: 'all' }).length, 0);
  assert.deepEqual(Object.values(data.categories).map(c => [c.minArea, c.maxArea, c.monthlyPrice, c.priceFrom]), [[1.9, 2.99, 3000, false], [3, 3.99, 4000, false], [4, 5.99, 5000, true]]);
  for (const unit of data.units) {
    assert.equal(core.offerPrice(unit, data.categories), unit.status === 'available' ? 3000 : null);
    assert.equal(unit.photo, null);
    assert.ok(fs.existsSync(path.join(root, unit.plan)));
    assert.equal(unit.plan, plans[String(unit.building)][String(unit.section)].src);
  }
});
test('Фильтры: занятый корпус, секция, пересечения и сброс на все', () => {
  assert.equal(find({ building: '1' }).length, 0);
  assert.equal(find({ building: '1', availability: 'all' }).length, 7);
  assert.deepEqual(find({ building: '2', section: '3' }).map(u => u.number), [92, 94]);
  assert.deepEqual(find({ section: '4' }).map(u => u.number), [131]);
  assert.deepEqual(find({ building: '1', section: '6', category: 'universal', availability: 'occupied' }).map(u => u.number), [252, 253]);
  assert.equal(find({ building: '2', category: 'universal', availability: 'all' }).length, 0);
  assert.equal(find({ availability: 'all' }).length, 14);
});
test('Обращение и адрес Telegram: параметры выбранной кладовой, без отправки за пользователя', () => {
  const unit = data.units.find(u => u.number === 92 && u.building === 2);
  const message = core.composeMessage(unit, data);
  assert.equal(message, 'Здравствуйте! Интересует аренда кладовой №92, Республики, 205, корпус 2, секция 3, площадь 2,10 м², стоимость 3 000 ₽/мес. Хотел бы договориться об осмотре');
  const link = new URL(core.telegramLink(message));
  assert.equal(link.origin + link.pathname, 'https://t.me/Skladex');
  assert.equal(link.searchParams.get('text'), message);
  for (const occupied of data.units.filter(u => u.status === 'occupied')) assert.equal(core.composeMessage(occupied, data), null);
});
test('Освобождённая кладовая появляется автоматически и получает месячный тариф', () => {
  const changed = structuredClone(data);
  const unit = changed.units.find(u => u.number === 252);
  unit.status = 'available'; // Цена была null: применяется тариф категории.
  assert.equal(core.filterUnits(changed.units, defaults).length, 4);
  assert.equal(core.offerPrice(unit, changed.categories), 4000);
  assert.match(core.composeMessage(unit, changed), /площадь 3,26 м², стоимость 4 000 ₽/);
});
test('Новые адреса и объекты используют данные без изменения шаблона', () => {
  const changed = structuredClone(data);
  changed.addresses.new = { city: 'Тюмень', street: 'Новый адрес', house: '1' };
  const unit = { ...changed.units[0], id: 'new-b3-1', addressId: 'new', building: 3, number: 1, section: 1, status: 'available', monthlyOfferPrice: 3500, plan: null };
  changed.units.push(unit);
  core.validateData(changed);
  assert.equal(core.filterUnits(changed.units, { ...defaults, building: '3' }).length, 1);
  assert.match(core.composeMessage(unit, changed), /Новый адрес, 1, корпус 3/);
});
test('Повреждённые данные не публикуются как свободные предложения', () => {
  const duplicate = structuredClone(data); duplicate.units.push({ ...duplicate.units[0] });
  assert.throws(() => core.validateData(duplicate));
  const wrong = structuredClone(data); wrong.units[0].category = 'spacious';
  assert.throws(() => core.validateData(wrong));
});

test('Новые схемы двух корпусов изолированы, исходные файлы существуют', () => {
  assert.deepEqual(Object.keys(plans['1']).map(Number), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(Object.keys(plans['2']).map(Number), [1,2,3,4,6,7,8]);
  assert.equal(plans['2']['5'], undefined);
  const used = new Set();
  for (const [building, sections] of Object.entries(plans)) {
    for (const [section, plan] of Object.entries(sections)) {
      assert.equal(plan.src, `floorplans/republic_205-${building}-${section}.png`);
      assert.ok(fs.existsSync(path.join(root, plan.src)));
      assert.ok(plan.width > 0 && plan.height > 0);
      assert.ok(!used.has(plan.src)); used.add(plan.src);
    }
  }
  assert.equal(used.size, 17);
});

test('Адрес Машарова, 10: точные площади из списка, без дома 8 и посторонних объектов', () => {
  core.validateData(allData);
  const units = core.filterUnits(allData.units, { addressId: 'masharova-10', availability: 'all' });
  const expected = [[27,481],[29,572],[36,406],[37,388],[39,406],[51,420],[52,403],[53,339],[86,525],[91,530],[92,543],[94,488],[95,229],[96,239]];
  assert.deepEqual(units.filter(u=>u.area!==null).map(u => [u.number,Math.round(u.area*100)]).sort((a,b)=>a[0]-b[0]),expected);
  assert.equal(units.reduce((s,u)=>s+Math.round(u.area*100),0),5969);
  assert.ok(units.every(u=>u.building===null && u.section===null && u.plan===null));
  assert.ok(!units.some(u=>u.number===19));
  assert.equal(new Set(allData.units.map(u=>u.id)).size,allData.units.length);
  const available = core.filterUnits(allData.units, {addressId:'masharova-10',availability:'available'});
  assert.deepEqual(available.map(u=>u.number).sort((a,b)=>a-b),[29,87,94]);
  assert.ok(available.filter(u=>u.area!==null).every(u=>u.category==='spacious'));
  const message = core.composeMessage(available[0],allData);
  assert.match(message,/Николая Машарова, 10/);
  assert.match(message,/стоимость от 5 000 ₽/);
  assert.doesNotMatch(message,/корпус|секция|null|undefined/);
  assert.equal(core.filterUnits(allData.units,{addressId:'masharova-10',building:'1',availability:'all'}).length,0);
});
test('При неизвестном наличии предлагается уточнение, без выдуманной цены и брони', () => {
  const unit = {...allData.units.find(u=>u.addressId==='masharova-10'),status:'on_request'};
  assert.equal(core.offerPrice(unit,allData.categories),null);
  const message=core.composeMessage(unit,allData);
  assert.match(message,/Подскажите, свободна ли кладовая/);
  assert.doesNotMatch(message,/₽|забронирована|корпус null|секция null/);
});

test('Подтверждённая свободная №87 доступна без выдуманных площади и стоимости', () => {
  const unit=allData.units.find(u=>u.id==='masharova-10-87');
  assert.equal(allData.units.length,29);
  assert.equal(unit.status,'available');
  assert.equal(unit.area,null);assert.equal(unit.category,null);assert.equal(unit.monthlyOfferPrice,null);
  assert.equal(core.offerPrice(unit,allData.categories),null);
  const message=core.composeMessage(unit,allData);
  assert.match(message,/кладовой №87, Николая Машарова, 10/);
  assert.match(message,/Подскажите площадь и стоимость аренды/);
  assert.doesNotMatch(message,/0,00|₽|null|undefined/);
  assert.equal(core.filterUnits(allData.units,{addressId:'masharova-10',availability:'available'}).length,3);
});
