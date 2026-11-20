/**
 * ⚠️ FICTIONAL DEMO DATA — not a real menu, not real prices.
 * Used only by the Phase 1 demo data source.
 */
import type { Branch, Catalog, Category, ModifierGroup, Product } from '@/domain/types'

export const DEMO_BRANCHES: Branch[] = [
  {
    id: 'chilonzor',
    code: 'CHL',
    name: { uz: 'Chilonzor filiali', ru: 'Филиал Чиланзар' },
    address: { uz: "Demo ko'chasi, 1-uy (fiktiv manzil)", ru: 'ул. Демо, д. 1 (вымышленный адрес)' },
    phone: '+998 00 000-00-01',
    ticketPrefix: 'C',
  },
  {
    id: 'yunusobod',
    code: 'YUN',
    name: { uz: 'Yunusobod filiali', ru: 'Филиал Юнусабад' },
    address: { uz: "Namuna ko'chasi, 2-uy (fiktiv manzil)", ru: 'ул. Образец, д. 2 (вымышленный адрес)' },
    phone: '+998 00 000-00-02',
    ticketPrefix: 'Y',
  },
]

const ALL = DEMO_BRANCHES.map((b) => b.id)

export const DEMO_CATEGORIES: Category[] = [
  { id: 'hotdogs', name: { uz: 'Hot-doglar', ru: 'Хот-доги' }, sort: 1 },
  { id: 'burgers', name: { uz: 'Burgerlar', ru: 'Бургеры' }, sort: 2 },
  { id: 'sides', name: { uz: 'Gazaklar', ru: 'Закуски' }, sort: 3 },
  { id: 'drinks', name: { uz: 'Ichimliklar', ru: 'Напитки' }, sort: 4 },
  { id: 'combos', name: { uz: 'Kombo', ru: 'Комбо' }, sort: 5 },
]

export const DEMO_MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: 'sauces',
    name: { uz: 'Souslar', ru: 'Соусы' },
    selection: 'multi',
    required: false,
    max: 3,
    options: [
      { id: 'ketchup', name: { uz: 'Ketchup', ru: 'Кетчуп' }, priceDelta: 0 },
      { id: 'mustard', name: { uz: 'Xantal', ru: 'Горчица' }, priceDelta: 0 },
      { id: 'mayo', name: { uz: 'Mayonez', ru: 'Майонез' }, priceDelta: 0 },
      { id: 'cheese-sauce', name: { uz: 'Pishloqli sous', ru: 'Сырный соус' }, priceDelta: 3000 },
      { id: 'bbq', name: { uz: 'BBQ sous', ru: 'Соус BBQ' }, priceDelta: 3000 },
    ],
  },
  {
    id: 'extras',
    name: { uz: "Qo'shimchalar", ru: 'Добавки' },
    selection: 'multi',
    required: false,
    options: [
      { id: 'extra-cheese', name: { uz: 'Pishloq', ru: 'Сыр' }, priceDelta: 4000 },
      { id: 'jalapeno', name: { uz: 'Xalapenyo', ru: 'Халапеньо' }, priceDelta: 3000 },
      { id: 'bacon', name: { uz: 'Bekon (mol go‘shti)', ru: 'Бекон (говяжий)' }, priceDelta: 7000 },
      { id: 'extra-sausage', name: { uz: "Qo'shimcha sosiska", ru: 'Доп. сосиска' }, priceDelta: 9000 },
      { id: 'crispy-onion', name: { uz: 'Qovurilgan piyoz', ru: 'Хрустящий лук' }, priceDelta: 2000 },
    ],
  },
  {
    id: 'remove',
    name: { uz: 'Olib tashlash', ru: 'Убрать' },
    selection: 'multi',
    required: false,
    options: [
      { id: 'no-onion', name: { uz: 'Piyozsiz', ru: 'Без лука' }, priceDelta: 0 },
      { id: 'no-pickles', name: { uz: 'Bodringsiz', ru: 'Без огурцов' }, priceDelta: 0 },
      { id: 'no-sauce', name: { uz: 'Soussiz', ru: 'Без соуса' }, priceDelta: 0 },
    ],
  },
  {
    id: 'spice',
    name: { uz: 'Achchiqlik', ru: 'Острота' },
    selection: 'single',
    required: true,
    defaultOptionId: 'mild',
    options: [
      { id: 'mild', name: { uz: 'Achchiq emas', ru: 'Не острый' }, priceDelta: 0 },
      { id: 'medium', name: { uz: "O'rtacha", ru: 'Средний' }, priceDelta: 0 },
      { id: 'hot', name: { uz: 'Achchiq', ru: 'Острый' }, priceDelta: 0 },
    ],
  },
  {
    id: 'drink-size',
    name: { uz: 'Hajmi', ru: 'Объём' },
    selection: 'single',
    required: true,
    defaultOptionId: '05',
    options: [
      { id: '033', name: { uz: '0,33 l', ru: '0,33 л' }, priceDelta: -2000 },
      { id: '05', name: { uz: '0,5 l', ru: '0,5 л' }, priceDelta: 0 },
      { id: '1', name: { uz: '1 l', ru: '1 л' }, priceDelta: 5000 },
    ],
  },
  {
    id: 'fries-size',
    name: { uz: 'Porsiya', ru: 'Порция' },
    selection: 'single',
    required: true,
    defaultOptionId: 'm',
    options: [
      { id: 's', name: { uz: 'Kichik', ru: 'Маленькая' }, priceDelta: -3000 },
      { id: 'm', name: { uz: "O'rta", ru: 'Средняя' }, priceDelta: 0 },
      { id: 'l', name: { uz: 'Katta', ru: 'Большая' }, priceDelta: 5000 },
    ],
  },
  {
    id: 'ice',
    name: { uz: 'Muz', ru: 'Лёд' },
    selection: 'single',
    required: false,
    options: [
      { id: 'no-ice', name: { uz: 'Muzsiz', ru: 'Без льда' }, priceDelta: 0 },
      { id: 'less-ice', name: { uz: 'Kam muz', ru: 'Мало льда' }, priceDelta: 0 },
    ],
  },
  {
    id: 'combo-drink',
    name: { uz: 'Kombo ichimligi', ru: 'Напиток в комбо' },
    selection: 'single',
    required: true,
    defaultOptionId: 'cola',
    options: [
      { id: 'cola', name: { uz: 'Kola', ru: 'Кола' }, priceDelta: 0 },
      { id: 'lemonade', name: { uz: 'Limonad', ru: 'Лимонад' }, priceDelta: 0 },
      { id: 'ayran', name: { uz: 'Ayron', ru: 'Айран' }, priceDelta: 0 },
      { id: 'juice', name: { uz: 'Sharbat', ru: 'Сок' }, priceDelta: 3000 },
    ],
  },
  {
    id: 'combo-side',
    name: { uz: 'Kombo gazagi', ru: 'Закуска в комбо' },
    selection: 'single',
    required: true,
    defaultOptionId: 'fries',
    options: [
      { id: 'fries', name: { uz: 'Kartoshka fri', ru: 'Картофель фри' }, priceDelta: 0 },
      { id: 'wedges', name: { uz: 'Dehqoncha kartoshka', ru: 'Картофель по-деревенски' }, priceDelta: 3000 },
      { id: 'rings', name: { uz: 'Piyoz halqalari', ru: 'Луковые кольца' }, priceDelta: 4000 },
    ],
  },
]

const p = (
  id: string,
  categoryId: Product['categoryId'],
  uz: string,
  ru: string,
  price: number,
  modifierGroupIds: string[],
  tone: Product['tone'],
  description?: Product['description'],
): Product => ({
  id,
  sku: id.toUpperCase().replace(/-/g, ''),
  categoryId,
  name: { uz, ru },
  description,
  price,
  modifierGroupIds,
  active: true,
  branchIds: ALL,
  tone,
})

const HOTDOG_MODS = ['sauces', 'extras', 'remove', 'spice']
const BURGER_MODS = ['sauces', 'extras', 'remove', 'spice']

export const DEMO_PRODUCTS: Product[] = [
  // Hot dogs
  p('hd-classic', 'hotdogs', 'Klassik hot-dog', 'Классический хот-дог', 18000, HOTDOG_MODS, 'red', {
    uz: 'Mol go‘shtli sosiska, bulochka, souslar',
    ru: 'Говяжья сосиска, булочка, соусы',
  }),
  p('hd-double', 'hotdogs', 'Dabl hot-dog', 'Дабл хот-дог', 27000, HOTDOG_MODS, 'red'),
  p('hd-cheese', 'hotdogs', 'Pishloqli hot-dog', 'Хот-дог с сыром', 23000, HOTDOG_MODS, 'mustard'),
  p('hd-spicy', 'hotdogs', 'Achchiq hot-dog', 'Острый хот-дог', 22000, HOTDOG_MODS, 'red'),
  p('hd-french', 'hotdogs', 'Fransuzcha hot-dog', 'Французский хот-дог', 20000, HOTDOG_MODS, 'brown'),
  p('hd-chicken', 'hotdogs', 'Tovuqli hot-dog', 'Куриный хот-дог', 19000, HOTDOG_MODS, 'mustard'),
  p('hd-kids', 'hotdogs', 'Bolalar hot-dogi', 'Детский хот-дог', 14000, ['sauces'], 'green'),

  // Burgers
  p('bg-classic', 'burgers', 'Klassik burger', 'Классический бургер', 32000, BURGER_MODS, 'brown'),
  p('bg-cheese', 'burgers', 'Chizburger', 'Чизбургер', 35000, BURGER_MODS, 'mustard'),
  p('bg-double', 'burgers', 'Dabl chizburger', 'Дабл чизбургер', 48000, BURGER_MODS, 'brown'),
  p('bg-chicken', 'burgers', 'Krispi tovuq burger', 'Криспи чикен бургер', 33000, BURGER_MODS, 'mustard'),
  p('bg-bbq', 'burgers', 'BBQ burger', 'BBQ бургер', 42000, BURGER_MODS, 'brown'),

  // Sides
  p('sd-fries', 'sides', 'Kartoshka fri', 'Картофель фри', 16000, ['fries-size', 'sauces'], 'mustard'),
  p('sd-wedges', 'sides', 'Dehqoncha kartoshka', 'Картофель по-деревенски', 19000, ['fries-size', 'sauces'], 'mustard'),
  p('sd-rings', 'sides', 'Piyoz halqalari', 'Луковые кольца', 20000, ['sauces'], 'mustard'),
  p('sd-nuggets', 'sides', 'Naggetslar (6 dona)', 'Наггетсы (6 шт.)', 24000, ['sauces'], 'brown'),
  p('sd-salad', 'sides', 'Sabzavotli salat', 'Овощной салат', 17000, [], 'green'),

  // Drinks
  p('dr-cola', 'drinks', 'Kola', 'Кола', 10000, ['drink-size', 'ice'], 'blue'),
  p('dr-lemonade', 'drinks', 'Uy limonadi', 'Домашний лимонад', 15000, ['drink-size', 'ice'], 'green'),
  p('dr-ayran', 'drinks', 'Ayron', 'Айран', 8000, [], 'blue'),
  p('dr-juice', 'drinks', 'Sharbat', 'Сок', 12000, ['drink-size'], 'mustard'),
  p('dr-water', 'drinks', 'Suv', 'Вода', 5000, [], 'blue'),
  p('dr-tea', 'drinks', "Ko'k choy", 'Зелёный чай', 6000, [], 'green'),
  p('dr-coffee', 'drinks', 'Amerikano', 'Американо', 14000, [], 'brown'),

  // Combos
  p('cb-hotdog', 'combos', 'Hot-dog kombo', 'Комбо хот-дог', 38000, ['combo-side', 'combo-drink', 'spice'], 'purple', {
    uz: 'Klassik hot-dog + gazak + ichimlik',
    ru: 'Классический хот-дог + закуска + напиток',
  }),
  p('cb-burger', 'combos', 'Burger kombo', 'Комбо бургер', 52000, ['combo-side', 'combo-drink', 'spice'], 'purple', {
    uz: 'Chizburger + gazak + ichimlik',
    ru: 'Чизбургер + закуска + напиток',
  }),
  p('cb-double', 'combos', 'Ikki kishilik kombo', 'Комбо на двоих', 89000, ['combo-side', 'combo-drink'], 'purple', {
    uz: '2 hot-dog + 2 gazak + 2 ichimlik',
    ru: '2 хот-дога + 2 закуски + 2 напитка',
  }),
  p('cb-kids', 'combos', 'Bolalar kombosi', 'Детское комбо', 30000, ['combo-drink'], 'green'),
]

export const DEMO_CATALOG: Catalog = {
  categories: DEMO_CATEGORIES,
  products: DEMO_PRODUCTS,
  modifierGroups: DEMO_MODIFIER_GROUPS,
}
