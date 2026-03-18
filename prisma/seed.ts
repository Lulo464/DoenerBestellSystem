import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Prüfe ob Datenbank bereits geseedet wurde
  const isSeeded = await prisma.systemSettings.findUnique({
    where: { key: 'database_seeded' },
  })

  if (isSeeded) {
    console.log('✅ Datenbank ist bereits geseedet, überspringe Seeding...')
    return
  }

  // ==================== Users ====================
  console.log('Creating users...')
  
  const hashedPassword = await bcrypt.hash('password123', 12)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@firma.de' },
    update: {},
    create: {
      email: 'superadmin@firma.de',
      name: 'Super Administrator',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  })

  const headAdmin = await prisma.user.upsert({
    where: { email: 'hauptadmin@firma.de' },
    update: {},
    create: {
      email: 'hauptadmin@firma.de',
      name: 'Haupt Administrator',
      password: hashedPassword,
      role: Role.HEAD_ADMIN,
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@firma.de' },
    update: {},
    create: {
      email: 'admin@firma.de',
      name: 'Administrator',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })

  const employee1 = await prisma.user.upsert({
    where: { email: 'max.mustermann@firma.de' },
    update: {},
    create: {
      email: 'max.mustermann@firma.de',
      name: 'Max Mustermann',
      password: hashedPassword,
      role: Role.EMPLOYEE,
    },
  })

  const employee2 = await prisma.user.upsert({
    where: { email: 'erika.musterfrau@firma.de' },
    update: {},
    create: {
      email: 'erika.musterfrau@firma.de',
      name: 'Erika Musterfrau',
      password: hashedPassword,
      role: Role.EMPLOYEE,
    },
  })

  console.log('✅ Users created')

  // ==================== Payment Accounts ====================
  console.log('Creating payment accounts...')

  const doenerKasse = await prisma.paymentAccount.upsert({
    where: { id: 'pa-doener' },
    update: {},
    create: {
      id: 'pa-doener',
      name: 'Döner-Kasse',
      iban: 'DE89370400440532013000',
      accountHolder: 'Döner Team GmbH',
      bic: 'COBADEFFXXX',
      paypalEmail: 'doener@firma.de',
      paypalMeLink: 'https://paypal.me/doenerteam',
      isDefault: true,
      isActive: true,
    },
  })

  const pizzaKasse = await prisma.paymentAccount.upsert({
    where: { id: 'pa-pizza' },
    update: {},
    create: {
      id: 'pa-pizza',
      name: 'Pizza-Kasse',
      iban: 'DE91100000000123456789',
      accountHolder: 'Pizza Express',
      bic: 'MARKDEF1100',
      paypalEmail: 'pizza@firma.de',
      paypalMeLink: 'https://paypal.me/pizzaexpress',
      isDefault: false,
      isActive: true,
    },
  })

  const getraenkeKasse = await prisma.paymentAccount.upsert({
    where: { id: 'pa-getraenke' },
    update: {},
    create: {
      id: 'pa-getraenke',
      name: 'Getränke-Kasse',
      iban: 'DE75512108001245126199',
      accountHolder: 'Getränke Service',
      bic: 'SOLADEST600',
      paypalEmail: null,
      paypalMeLink: null,
      isDefault: false,
      isActive: true,
    },
  })

  console.log('✅ Payment accounts created')

  // ==================== Categories ====================
  console.log('Creating categories...')

  const categoryDoener = await prisma.category.upsert({
    where: { id: 'cat-doener' },
    update: {},
    create: {
      id: 'cat-doener',
      name: 'Döner & Türkische Spezialitäten',
      description: 'Frisch zubereiteter Döner und mehr',
      sortOrder: 1,
    },
  })

  const categoryPizza = await prisma.category.upsert({
    where: { id: 'cat-pizza' },
    update: {},
    create: {
      id: 'cat-pizza',
      name: 'Pizza',
      description: 'Italienische Pizzen aus dem Steinofen',
      sortOrder: 2,
    },
  })

  const categoryBurger = await prisma.category.upsert({
    where: { id: 'cat-burger' },
    update: {},
    create: {
      id: 'cat-burger',
      name: 'Burger',
      description: 'Saftige Burger mit frischen Zutaten',
      sortOrder: 3,
    },
  })

  const categoryGetraenke = await prisma.category.upsert({
    where: { id: 'cat-getraenke' },
    update: {},
    create: {
      id: 'cat-getraenke',
      name: 'Getränke',
      description: 'Kalte und warme Getränke',
      sortOrder: 4,
    },
  })

  const categorySonstiges = await prisma.category.upsert({
    where: { id: 'cat-sonstiges' },
    update: {},
    create: {
      id: 'cat-sonstiges',
      name: 'Sonstiges',
      description: 'Sonderwünsche und Freitext-Anfragen',
      sortOrder: 99,
    },
  })

  console.log('✅ Categories created')

  // ==================== Products ====================
  console.log('Creating products...')

  // ----- Döner (konfigurierbar) -----
  const doenerKebab = await prisma.product.upsert({
    where: { id: 'prod-doener-kebab' },
    update: {},
    create: {
      id: 'prod-doener-kebab',
      name: 'Döner Kebab',
      description: 'Klassischer Döner im Fladenbrot mit frischem Salat',
      basePrice: 6.50,
      categoryId: categoryDoener.id,
      isConfigurable: true,
      sortOrder: 1,
    },
  })

  // Döner Option Groups
  const fleischGroup = await prisma.optionGroup.upsert({
    where: { id: 'og-doener-fleisch' },
    update: {},
    create: {
      id: 'og-doener-fleisch',
      name: 'Fleischauswahl',
      description: 'Wähle dein Fleisch',
      isRequired: true,
      isMultiple: false,
      minSelections: 1,
      maxSelections: 1,
      productId: doenerKebab.id,
      sortOrder: 1,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-fleisch-hahnchen' },
    update: {},
    create: {
      id: 'opt-fleisch-hahnchen',
      name: 'Hähnchen',
      priceModifier: 0,
      isDefault: true,
      optionGroupId: fleischGroup.id,
      sortOrder: 1,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-fleisch-kalb' },
    update: {},
    create: {
      id: 'opt-fleisch-kalb',
      name: 'Kalb',
      priceModifier: 1.00,
      optionGroupId: fleischGroup.id,
      sortOrder: 2,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-fleisch-mix' },
    update: {},
    create: {
      id: 'opt-fleisch-mix',
      name: 'Mix (Hähnchen & Kalb)',
      priceModifier: 0.50,
      optionGroupId: fleischGroup.id,
      sortOrder: 3,
    },
  })

  const sauceGroup = await prisma.optionGroup.upsert({
    where: { id: 'og-doener-sauce' },
    update: {},
    create: {
      id: 'og-doener-sauce',
      name: 'Soße',
      description: 'Wähle deine Soße(n)',
      isRequired: true,
      isMultiple: true,
      minSelections: 1,
      maxSelections: 3,
      productId: doenerKebab.id,
      sortOrder: 2,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-sauce-knoblauch' },
    update: {},
    create: {
      id: 'opt-sauce-knoblauch',
      name: 'Knoblauchsoße',
      priceModifier: 0,
      isDefault: true,
      optionGroupId: sauceGroup.id,
      sortOrder: 1,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-sauce-scharf' },
    update: {},
    create: {
      id: 'opt-sauce-scharf',
      name: 'Scharfe Soße',
      priceModifier: 0,
      optionGroupId: sauceGroup.id,
      sortOrder: 2,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-sauce-krauter' },
    update: {},
    create: {
      id: 'opt-sauce-krauter',
      name: 'Kräutersoße',
      priceModifier: 0,
      optionGroupId: sauceGroup.id,
      sortOrder: 3,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-sauce-cocktail' },
    update: {},
    create: {
      id: 'opt-sauce-cocktail',
      name: 'Cocktailsoße',
      priceModifier: 0.50,
      optionGroupId: sauceGroup.id,
      sortOrder: 4,
    },
  })

  const extrasGroup = await prisma.optionGroup.upsert({
    where: { id: 'og-doener-extras' },
    update: {},
    create: {
      id: 'og-doener-extras',
      name: 'Extras',
      description: 'Zusätzliche Zutaten',
      isRequired: false,
      isMultiple: true,
      minSelections: 0,
      maxSelections: null,
      productId: doenerKebab.id,
      sortOrder: 3,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-extra-kaese' },
    update: {},
    create: {
      id: 'opt-extra-kaese',
      name: 'Extra Käse',
      priceModifier: 1.00,
      optionGroupId: extrasGroup.id,
      sortOrder: 1,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-extra-fleisch' },
    update: {},
    create: {
      id: 'opt-extra-fleisch',
      name: 'Extra Fleisch',
      priceModifier: 2.00,
      optionGroupId: extrasGroup.id,
      sortOrder: 2,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-extra-feta' },
    update: {},
    create: {
      id: 'opt-extra-feta',
      name: 'Feta-Käse',
      priceModifier: 1.50,
      optionGroupId: extrasGroup.id,
      sortOrder: 3,
    },
  })

  await prisma.option.upsert({
    where: { id: 'opt-extra-jalapenos' },
    update: {},
    create: {
      id: 'opt-extra-jalapenos',
      name: 'Jalapeños',
      priceModifier: 0.50,
      optionGroupId: extrasGroup.id,
      sortOrder: 4,
    },
  })

  // ----- Döner Teller -----
  const doenerTeller = await prisma.product.upsert({
    where: { id: 'prod-doener-teller' },
    update: {},
    create: {
      id: 'prod-doener-teller',
      name: 'Döner Teller',
      description: 'Döner mit Reis, Salat und Soße',
      basePrice: 9.50,
      categoryId: categoryDoener.id,
      isConfigurable: true,
      sortOrder: 2,
    },
  })

  // Döner Teller hat dieselben Optionen wie Döner Kebab
  const fleischGroupTeller = await prisma.optionGroup.upsert({
    where: { id: 'og-teller-fleisch' },
    update: {},
    create: {
      id: 'og-teller-fleisch',
      name: 'Fleischauswahl',
      isRequired: true,
      isMultiple: false,
      minSelections: 1,
      maxSelections: 1,
      productId: doenerTeller.id,
      sortOrder: 1,
    },
  })

  await prisma.option.createMany({
    data: [
      { id: 'opt-teller-hahnchen', name: 'Hähnchen', priceModifier: 0, isDefault: true, optionGroupId: fleischGroupTeller.id, sortOrder: 1 },
      { id: 'opt-teller-kalb', name: 'Kalb', priceModifier: 1.50, optionGroupId: fleischGroupTeller.id, sortOrder: 2 },
      { id: 'opt-teller-mix', name: 'Mix', priceModifier: 0.75, optionGroupId: fleischGroupTeller.id, sortOrder: 3 },
    ],
    skipDuplicates: true,
  })

  // ----- Dürüm -----
  const dueruem = await prisma.product.upsert({
    where: { id: 'prod-dueruem' },
    update: {},
    create: {
      id: 'prod-dueruem',
      name: 'Dürüm',
      description: 'Döner im dünnen Yufka-Fladen gerollt',
      basePrice: 7.00,
      categoryId: categoryDoener.id,
      isConfigurable: true,
      sortOrder: 3,
    },
  })

  const fleischGroupDueruem = await prisma.optionGroup.upsert({
    where: { id: 'og-dueruem-fleisch' },
    update: {},
    create: {
      id: 'og-dueruem-fleisch',
      name: 'Fleischauswahl',
      isRequired: true,
      isMultiple: false,
      minSelections: 1,
      maxSelections: 1,
      productId: dueruem.id,
      sortOrder: 1,
    },
  })

  await prisma.option.createMany({
    data: [
      { id: 'opt-dueruem-hahnchen', name: 'Hähnchen', priceModifier: 0, isDefault: true, optionGroupId: fleischGroupDueruem.id, sortOrder: 1 },
      { id: 'opt-dueruem-kalb', name: 'Kalb', priceModifier: 1.00, optionGroupId: fleischGroupDueruem.id, sortOrder: 2 },
    ],
    skipDuplicates: true,
  })

  // ----- Lahmacun -----
  await prisma.product.upsert({
    where: { id: 'prod-lahmacun' },
    update: {},
    create: {
      id: 'prod-lahmacun',
      name: 'Lahmacun',
      description: 'Türkische Pizza mit Hackfleisch',
      basePrice: 5.00,
      categoryId: categoryDoener.id,
      isConfigurable: false,
      sortOrder: 4,
    },
  })

  // ----- Pizzen -----
  await prisma.product.upsert({
    where: { id: 'prod-pizza-margherita' },
    update: {},
    create: {
      id: 'prod-pizza-margherita',
      name: 'Pizza Margherita',
      description: 'Tomatensoße, Mozzarella, Basilikum',
      basePrice: 7.50,
      categoryId: categoryPizza.id,
      isConfigurable: false,
      sortOrder: 1,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-pizza-salami' },
    update: {},
    create: {
      id: 'prod-pizza-salami',
      name: 'Pizza Salami',
      description: 'Tomatensoße, Mozzarella, Salami',
      basePrice: 8.50,
      categoryId: categoryPizza.id,
      isConfigurable: false,
      sortOrder: 2,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-pizza-hawaii' },
    update: {},
    create: {
      id: 'prod-pizza-hawaii',
      name: 'Pizza Hawaii',
      description: 'Tomatensoße, Mozzarella, Schinken, Ananas',
      basePrice: 9.00,
      categoryId: categoryPizza.id,
      isConfigurable: false,
      sortOrder: 3,
    },
  })

  const pizzaSpezial = await prisma.product.upsert({
    where: { id: 'prod-pizza-spezial' },
    update: {},
    create: {
      id: 'prod-pizza-spezial',
      name: 'Pizza Spezial',
      description: 'Wähle deine eigenen Beläge',
      basePrice: 8.00,
      categoryId: categoryPizza.id,
      isConfigurable: true,
      sortOrder: 4,
    },
  })

  const pizzaBelagGroup = await prisma.optionGroup.upsert({
    where: { id: 'og-pizza-belag' },
    update: {},
    create: {
      id: 'og-pizza-belag',
      name: 'Beläge',
      description: 'Wähle bis zu 5 Beläge',
      isRequired: true,
      isMultiple: true,
      minSelections: 1,
      maxSelections: 5,
      productId: pizzaSpezial.id,
      sortOrder: 1,
    },
  })

  await prisma.option.createMany({
    data: [
      { id: 'opt-pizza-salami', name: 'Salami', priceModifier: 1.00, optionGroupId: pizzaBelagGroup.id, sortOrder: 1 },
      { id: 'opt-pizza-schinken', name: 'Schinken', priceModifier: 1.00, optionGroupId: pizzaBelagGroup.id, sortOrder: 2 },
      { id: 'opt-pizza-pilze', name: 'Champignons', priceModifier: 0.80, optionGroupId: pizzaBelagGroup.id, sortOrder: 3 },
      { id: 'opt-pizza-paprika', name: 'Paprika', priceModifier: 0.60, optionGroupId: pizzaBelagGroup.id, sortOrder: 4 },
      { id: 'opt-pizza-zwiebeln', name: 'Zwiebeln', priceModifier: 0.50, optionGroupId: pizzaBelagGroup.id, sortOrder: 5 },
      { id: 'opt-pizza-oliven', name: 'Oliven', priceModifier: 0.80, optionGroupId: pizzaBelagGroup.id, sortOrder: 6 },
      { id: 'opt-pizza-thunfisch', name: 'Thunfisch', priceModifier: 1.50, optionGroupId: pizzaBelagGroup.id, sortOrder: 7 },
      { id: 'opt-pizza-ananas', name: 'Ananas', priceModifier: 0.80, optionGroupId: pizzaBelagGroup.id, sortOrder: 8 },
    ],
    skipDuplicates: true,
  })

  // ----- Burger -----
  const classicBurger = await prisma.product.upsert({
    where: { id: 'prod-burger-classic' },
    update: {},
    create: {
      id: 'prod-burger-classic',
      name: 'Classic Burger',
      description: 'Rindfleisch-Patty, Salat, Tomate, Zwiebel, Burgersauce',
      basePrice: 6.50,
      categoryId: categoryBurger.id,
      isConfigurable: true,
      sortOrder: 1,
    },
  })

  const burgerExtrasGroup = await prisma.optionGroup.upsert({
    where: { id: 'og-burger-extras' },
    update: {},
    create: {
      id: 'og-burger-extras',
      name: 'Extras',
      isRequired: false,
      isMultiple: true,
      minSelections: 0,
      maxSelections: null,
      productId: classicBurger.id,
      sortOrder: 1,
    },
  })

  await prisma.option.createMany({
    data: [
      { id: 'opt-burger-cheese', name: 'Extra Käse', priceModifier: 0.80, optionGroupId: burgerExtrasGroup.id, sortOrder: 1 },
      { id: 'opt-burger-bacon', name: 'Bacon', priceModifier: 1.20, optionGroupId: burgerExtrasGroup.id, sortOrder: 2 },
      { id: 'opt-burger-egg', name: 'Spiegelei', priceModifier: 1.00, optionGroupId: burgerExtrasGroup.id, sortOrder: 3 },
      { id: 'opt-burger-jalapeno', name: 'Jalapeños', priceModifier: 0.50, optionGroupId: burgerExtrasGroup.id, sortOrder: 4 },
      { id: 'opt-burger-patty', name: 'Extra Patty', priceModifier: 2.50, optionGroupId: burgerExtrasGroup.id, sortOrder: 5 },
    ],
    skipDuplicates: true,
  })

  await prisma.product.upsert({
    where: { id: 'prod-burger-cheese' },
    update: {},
    create: {
      id: 'prod-burger-cheese',
      name: 'Cheeseburger',
      description: 'Classic Burger mit Cheddar',
      basePrice: 7.00,
      categoryId: categoryBurger.id,
      isConfigurable: false,
      sortOrder: 2,
    },
  })

  await prisma.product.upsert({
    where: { id: 'prod-burger-veggie' },
    update: {},
    create: {
      id: 'prod-burger-veggie',
      name: 'Veggie Burger',
      description: 'Vegetarisches Patty mit Grillgemüse',
      basePrice: 7.50,
      categoryId: categoryBurger.id,
      isConfigurable: false,
      sortOrder: 3,
    },
  })

  // ----- Getränke -----
  await prisma.product.createMany({
    data: [
      { id: 'prod-cola', name: 'Cola 0,33l', description: 'Erfrischend', basePrice: 2.00, categoryId: categoryGetraenke.id, sortOrder: 1 },
      { id: 'prod-fanta', name: 'Fanta 0,33l', description: 'Orange', basePrice: 2.00, categoryId: categoryGetraenke.id, sortOrder: 2 },
      { id: 'prod-sprite', name: 'Sprite 0,33l', description: 'Zitrone-Limette', basePrice: 2.00, categoryId: categoryGetraenke.id, sortOrder: 3 },
      { id: 'prod-wasser', name: 'Wasser 0,5l', description: 'Still oder Medium', basePrice: 1.50, categoryId: categoryGetraenke.id, sortOrder: 4 },
      { id: 'prod-ayran', name: 'Ayran', description: 'Türkisches Joghurtgetränk', basePrice: 2.00, categoryId: categoryGetraenke.id, sortOrder: 5 },
      { id: 'prod-kaffee', name: 'Kaffee', description: 'Frisch gebrüht', basePrice: 1.80, categoryId: categoryGetraenke.id, sortOrder: 6 },
      { id: 'prod-cappuccino', name: 'Cappuccino', description: 'Mit Milchschaum', basePrice: 2.50, categoryId: categoryGetraenke.id, sortOrder: 7 },
    ],
    skipDuplicates: true,
  })

  // ----- Freitext-Produkt für Sonderwünsche -----
  await prisma.product.upsert({
    where: { id: 'prod-custom-request' },
    update: {},
    create: {
      id: 'prod-custom-request',
      name: 'Sonderwunsch / Freitext-Anfrage',
      description: 'Für individuelle Bestellungen und spezielle Wünsche',
      basePrice: 0.00,
      categoryId: categorySonstiges.id,
      isConfigurable: false,
      sortOrder: 1,
    },
  })

  console.log('✅ Products created')

  // ==================== System Settings ====================
  console.log('Creating system settings...')

  await prisma.systemSettings.upsert({
    where: { key: 'custom_request_min_price' },
    update: {},
    create: {
      key: 'custom_request_min_price',
      value: '1.00',
      description: 'Mindestpreis für Freitext-Anfragen',
    },
  })

  await prisma.systemSettings.upsert({
    where: { key: 'custom_request_default_price' },
    update: {},
    create: {
      key: 'custom_request_default_price',
      value: '5.00',
      description: 'Standardpreis für Freitext-Anfragen (wenn kein Preis angegeben)',
    },
  })

  await prisma.systemSettings.upsert({
    where: { key: 'order_number_prefix' },
    update: {},
    create: {
      key: 'order_number_prefix',
      value: 'ORD',
      description: 'Präfix für Bestellnummern',
    },
  })

  await prisma.systemSettings.upsert({
    where: { key: 'totp_issuer' },
    update: {},
    create: {
      key: 'totp_issuer',
      value: 'Internes Bestellsystem',
      description: 'Name der App für TOTP-Authentifizierung',
    },
  })

  console.log('✅ System settings created')

  // Markiere Datenbank als geseedet
  await prisma.systemSettings.upsert({
    where: { key: 'database_seeded' },
    update: {},
    create: {
      key: 'database_seeded',
      value: 'true',
      description: 'Flag um zu verhindern, dass Seed-Daten mehrfach eingefügt werden',
    },
  })

  console.log('🎉 Seeding completed!')
  console.log('')
  console.log('📧 Test-Accounts:')
  console.log('   superadmin@firma.de / password123 (Superadmin)')
  console.log('   hauptadmin@firma.de / password123 (Hauptadmin)')
  console.log('   admin@firma.de / password123 (Admin)')
  console.log('   max.mustermann@firma.de / password123 (Mitarbeiter)')
  console.log('   erika.musterfrau@firma.de / password123 (Mitarbeiter)')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
