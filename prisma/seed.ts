import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
const SEED_DEV_DATA = process.env.SEED_DEV_DATA !== 'false';

const ROLES = [
  'SUPER_ADMIN',
  'STORE_MANAGER',
  'PRODUCT_MANAGER',
  'INVENTORY_MANAGER',
  'FULFILLMENT_STAFF',
  'CUSTOMER_SUPPORT',
  'MARKETING_MANAGER',
  'FINANCE_STAFF',
  'CUSTOMER',
] as const;

const PERMISSIONS: { key: string; name: string; group: string }[] = [
  { key: 'user.manage', name: 'Manage users & admins', group: 'Users' },
  { key: 'settings.manage', name: 'Manage global settings', group: 'Settings' },
  { key: 'product.read', name: 'View products', group: 'Catalog' },
  { key: 'product.create', name: 'Create products', group: 'Catalog' },
  { key: 'product.update', name: 'Update products', group: 'Catalog' },
  { key: 'product.delete', name: 'Delete/archive products', group: 'Catalog' },
  { key: 'category.read', name: 'View categories', group: 'Catalog' },
  { key: 'category.create', name: 'Create categories', group: 'Catalog' },
  { key: 'category.update', name: 'Update categories', group: 'Catalog' },
  { key: 'category.delete', name: 'Delete categories', group: 'Catalog' },
  { key: 'brand.read', name: 'View brands', group: 'Catalog' },
  { key: 'brand.create', name: 'Create brands', group: 'Catalog' },
  { key: 'brand.update', name: 'Update brands', group: 'Catalog' },
  { key: 'brand.delete', name: 'Delete brands', group: 'Catalog' },
  { key: 'inventory.read', name: 'View inventory', group: 'Inventory' },
  { key: 'inventory.update', name: 'Adjust inventory', group: 'Inventory' },
  { key: 'order.read', name: 'View orders', group: 'Orders' },
  { key: 'order.update', name: 'Update orders/fulfillment', group: 'Orders' },
  { key: 'payment.read', name: 'View payments', group: 'Payments' },
  { key: 'refund.read', name: 'View refunds', group: 'Payments' },
  { key: 'refund.process', name: 'Process refunds', group: 'Payments' },
  { key: 'customer.read', name: 'View customers', group: 'Customers' },
  { key: 'customer.update', name: 'Update customers', group: 'Customers' },
  { key: 'customer.export', name: 'Export customers', group: 'Customers' },
  { key: 'promotion.manage', name: 'Manage promotions/coupons', group: 'Marketing' },
  { key: 'content.read', name: 'View content', group: 'Content' },
  { key: 'content.update', name: 'Manage content', group: 'Content' },
  { key: 'marketing.read', name: 'View marketing data', group: 'Marketing' },
  { key: 'report.read', name: 'View reports', group: 'Reports' },
  { key: 'review.read', name: 'View reviews', group: 'Reviews' },
  { key: 'review.moderate', name: 'Moderate reviews', group: 'Reviews' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),
  STORE_MANAGER: [
    'product.read', 'product.create', 'product.update', 'product.delete',
    'category.read', 'category.create', 'category.update', 'category.delete',
    'brand.read', 'brand.create', 'brand.update', 'brand.delete',
    'inventory.read', 'inventory.update',
    'order.read', 'order.update',
    'customer.read', 'customer.update', 'customer.export',
    'promotion.manage', 'content.read', 'content.update', 'marketing.read',
    'report.read', 'review.read', 'review.moderate',
  ],
  PRODUCT_MANAGER: [
    'product.read', 'product.create', 'product.update', 'product.delete',
    'category.read', 'category.create', 'category.update', 'category.delete',
    'brand.read', 'brand.create', 'brand.update', 'brand.delete',
    'content.read', 'content.update',
  ],
  INVENTORY_MANAGER: ['inventory.read', 'inventory.update', 'product.read', 'report.read'],
  FULFILLMENT_STAFF: ['order.read', 'order.update', 'inventory.read', 'product.read'],
  CUSTOMER_SUPPORT: ['customer.read', 'customer.update', 'order.read', 'content.read'],
  MARKETING_MANAGER: ['promotion.manage', 'content.read', 'content.update', 'marketing.read', 'report.read', 'product.read', 'category.read'],
  FINANCE_STAFF: ['payment.read', 'refund.read', 'refund.process', 'report.read', 'order.read'],
  CUSTOMER: [],
};

async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

async function seedRolesAndPermissions() {
  for (const roleKey of ROLES) {
    await prisma.roleName.upsert({
      where: { key: roleKey as never },
      update: {},
      create: { key: roleKey as never, name: roleKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) },
    });
  }
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, group: perm.group },
      create: perm,
    });
  }
  const allPerms = await prisma.permission.findMany();
  const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));
  for (const [roleKey, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.roleName.findUnique({ where: { key: roleKey as never } });
    if (!role) continue;
    for (const key of keys) {
      const permissionId = permByKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
}

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) return;
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: { create: { role: { connect: { key: 'SUPER_ADMIN' } } } },
    },
  });
  await prisma.auditLog.create({
    data: { actorId: admin.id, action: 'seed.admin', entityType: 'user', entityId: admin.id, after: { email: ADMIN_EMAIL } },
  });
}

async function seedInfrastructure() {
  await prisma.inventoryLocation.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { name: 'Main Warehouse', code: 'MAIN', isDefault: true },
  });
  let zone = await prisma.shippingZone.findFirst({ where: { name: 'Ghana' } });
  if (!zone) {
    zone = await prisma.shippingZone.create({
      data: { name: 'Ghana', countries: ['GH'], regions: ['Greater Accra', 'Ashanti', 'Western', 'Volta'] },
    });
  }
  const methods = [
    { name: 'Standard Delivery', type: 'FLAT_RATE', price: 30, estimatedMinDays: 2, estimatedMaxDays: 5 },
    { name: 'Express Delivery', type: 'FLAT_RATE', price: 60, estimatedMinDays: 1, estimatedMaxDays: 2 },
    { name: 'Free Delivery (orders over ₵500)', type: 'FREE_SHIPPING', price: 0, minOrderAmount: 500, estimatedMinDays: 3, estimatedMaxDays: 6 },
  ];
  for (const m of methods) {
    const existingMethod = await prisma.shippingMethod.findFirst({ where: { zoneId: zone.id, name: m.name } });
    if (!existingMethod) {
      await prisma.shippingMethod.create({ data: { zoneId: zone.id, ...m, isActive: true } });
    }
  }
  const existingTax = await prisma.taxRule.findFirst({ where: { country: 'GH', region: null } });
  if (!existingTax) {
    await prisma.taxRule.create({
      data: { country: 'GH', name: 'Ghana VAT', rate: 0.15, isDefault: true },
    });
  }
  await prisma.storeSetting.upsert({
    where: { key: 'store' },
    update: {},
    create: {
      key: 'store',
      value: {
        name: 'Modern Commerce',
        currency: 'GHS',
        currencySymbol: '₵',
        timezone: 'Africa/Accra',
        email: 'support@example.com',
        phone: '+233 00 000 0000',
        address: 'Accra, Ghana',
      },
    },
  });
}

async function seedDevCatalog() {
  if (!SEED_DEV_DATA) return;

  const brands = [
    { name: 'Aurora', slug: 'aurora', description: 'Premium electronics' },
    { name: 'Northwind', slug: 'northwind', description: 'Outdoor & adventure gear' },
    { name: 'Lumina', slug: 'lumina', description: 'Home & living' },
    { name: 'Verdant', slug: 'verdant', description: 'Sustainable lifestyle' },
    { name: 'Proton', slug: 'proton', description: 'Audio & accessories' },
  ];
  const brandIds: Record<string, string> = {};
  for (const b of brands) {
    const created = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { description: b.description },
      create: b,
    });
    brandIds[b.slug] = created.id;
  }

  const categoryTree = [
    { name: 'Electronics', slug: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800' },
    { name: 'Fashion', slug: 'fashion', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800' },
    { name: 'Home & Living', slug: 'home-living', imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800' },
    { name: 'Outdoor', slug: 'outdoor', imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800' },
    { name: 'Beauty', slug: 'beauty', imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800' },
    { name: 'Computers', slug: 'computers', imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', parent: 'electronics' },
    { name: 'Mobile Phones', slug: 'mobile-phones', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', parent: 'electronics' },
    { name: 'Audio', slug: 'audio', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', parent: 'electronics' },
    { name: "Men's Clothing", slug: 'men-clothing', imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800', parent: 'fashion' },
    { name: "Women's Clothing", slug: 'women-clothing', imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800', parent: 'fashion' },
    { name: 'Furniture', slug: 'furniture', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', parent: 'home-living' },
    { name: 'Kitchen', slug: 'kitchen', imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800', parent: 'home-living' },
    { name: 'Camping', slug: 'camping', imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800', parent: 'outdoor' },
  ];
  const categoryIds: Record<string, string> = {};
  for (const c of categoryTree) {
    const parentId = c.parent ? categoryIds[c.parent] : undefined;
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { parentId, imageUrl: c.imageUrl },
      create: { name: c.name, slug: c.slug, parentId, imageUrl: c.imageUrl, visibility: 'VISIBLE' },
    });
    categoryIds[c.slug] = created.id;
  }

  const productSeed = [
    {
      name: 'Aurora Wireless Headphones Pro', slug: 'aurora-wireless-headphones-pro', sku: 'AUR-HP-001', brand: 'aurora',
      price: 899.0, compareAtPrice: 1099.0, categories: ['electronics', 'audio'], featured: true, soldCount: 320,
      description: 'Premium over-ear wireless headphones with active noise cancellation, 40-hour battery life, and studio-grade sound.',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    },
    {
      name: 'Proton Portable Bluetooth Speaker', slug: 'proton-portable-bluetooth-speaker', sku: 'PRO-SPK-002', brand: 'proton',
      price: 249.0, categories: ['electronics', 'audio'], soldCount: 210,
      description: 'Rugged, waterproof portable speaker with deep bass and 24-hour playtime.',
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    },
    {
      name: 'Aurora Ultrabook 14"', slug: 'aurora-ultrabook-14', sku: 'AUR-LAP-014', brand: 'aurora',
      price: 4599.0, compareAtPrice: 5199.0, weightGrams: 1290, categories: ['electronics', 'computers'], featured: true, soldCount: 150,
      description: 'Featherlight 14-inch ultrabook with a 2.8K display, 16GB RAM, and all-day battery.',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
    },
    {
      name: 'Aurora 5G Smartphone', slug: 'aurora-5g-smartphone', sku: 'AUR-PHN-5G', brand: 'aurora',
      price: 3299.0, categories: ['electronics', 'mobile-phones'], soldCount: 480,
      description: 'Flagship 5G smartphone with a 120Hz AMOLED display and pro-grade 108MP camera.',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
    },
    {
      name: 'Northwind Trail Backpack 40L', slug: 'northwind-trail-backpack-40l', sku: 'NWN-BPK-040', brand: 'northwind',
      price: 549.0, categories: ['outdoor', 'camping'], featured: true, soldCount: 190,
      description: 'Weatherproof 40L hiking backpack with suspension frame, rain cover, and hydration sleeve.',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    },
    {
      name: 'Northwind Camp Stove', slug: 'northwind-camp-stove', sku: 'NWN-STV-001', brand: 'northwind',
      price: 199.0, categories: ['outdoor', 'camping'], soldCount: 95,
      description: 'Compact, wind-resistant camping stove with piezoelectric ignition.',
      image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800',
    },
    {
      name: 'Lumina Ergonomic Desk Chair', slug: 'lumina-ergonomic-desk-chair', sku: 'LUM-CHA-002', brand: 'lumina',
      price: 1299.0, compareAtPrice: 1599.0, weightGrams: 15000, categories: ['home-living', 'furniture'], featured: true, soldCount: 130,
      description: 'Breathable mesh ergonomic chair with adjustable lumbar support and 4D armrests.',
      image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800',
    },
    {
      name: 'Lumina Cast Iron Cookware Set', slug: 'lumina-cast-iron-cookware-set', sku: 'LUM-KIT-001', brand: 'lumina',
      price: 899.0, categories: ['home-living', 'kitchen'], soldCount: 160,
      description: 'Pre-seasoned 7-piece cast iron cookware set for even, lasting heat.',
      image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800',
    },
    {
      name: 'Verdant Organic Cotton Tee', slug: 'verdant-organic-cotton-tee', sku: 'VER-TEE-001', brand: 'verdant',
      price: 129.0, categories: ['fashion', 'men-clothing'], soldCount: 540,
      description: 'Soft, ethically-made 100% organic cotton t-shirt, pre-shrunk.',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    },
    {
      name: 'Verdant Linen Shirt', slug: 'verdant-linen-shirt', sku: 'VER-SHT-002', brand: 'verdant',
      price: 349.0, categories: ['fashion', 'women-clothing'], soldCount: 210,
      description: 'Breathable European flax linen shirt with a relaxed fit.',
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
    },
  ];

  const location = await prisma.inventoryLocation.findUnique({ where: { code: 'MAIN' } });
  const categoryTags = ['Bestseller', 'New', 'Sale', 'Premium'];

  for (let i = 0; i < productSeed.length; i++) {
    const p = productSeed[i];
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    const saleData = p.compareAtPrice
      ? {
          salePrice: p.price,
          saleStartAt: new Date(Date.now() - 86400000 * 7),
          saleEndAt: new Date(Date.now() + 86400000 * 90),
        }
      : { salePrice: null, saleStartAt: null, saleEndAt: null };
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { soldCount: p.soldCount, featured: p.featured, ...saleData },
      });
      continue;
    }
    const sku = `${p.sku}-${i + 1}`;
    const product = await prisma.product.create({
      data: {
        type: 'SIMPLE',
        name: p.name,
        slug: p.slug,
        sku,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        ...saleData,
        costPrice: Math.round(p.price * 0.55 * 100) / 100,
        status: 'ACTIVE',
        visibility: 'VISIBLE',
        featured: p.featured,
        weightGrams: p.weightGrams ?? 500,
        soldCount: p.soldCount,
        ratingAvg: 4.5,
        ratingCount: Math.floor(Math.random() * 120) + 15,
        description: p.description,
        shortDescription: p.description.slice(0, 120),
        brandId: brandIds[p.brand],
        publishedAt: new Date(),
        images: {
          create: [{ url: p.image, alt: p.name, position: 0 }],
        },
        categories: {
          create: p.categories.map((slug) => ({ categoryId: categoryIds[slug] })),
        },
        tags: {
          create: [{ tag: { connectOrCreate: { where: { slug: categoryTags[i % 4].toLowerCase() }, create: { name: categoryTags[i % 4], slug: categoryTags[i % 4].toLowerCase() } } } }],
        },
        inventoryLevels: {
          create: location
            ? [{ locationId: location.id, physicalStock: 25 + (i % 8) * 12, lowStockThreshold: 8 }]
            : [],
        },
      },
    });
    void product;
  }
}

async function seedContent() {
  const pages = [
    { slug: 'about', title: 'About Us', body: '<p>Modern Commerce is a curated marketplace built for a premium shopping experience.</p>' },
    { slug: 'shipping-policy', title: 'Shipping Policy', body: '<p>We deliver across Ghana within 2–6 business days.</p>' },
    { slug: 'returns-refunds', title: 'Returns & Refunds', body: '<p>Unwanted items can be returned within 14 days of delivery.</p>' },
    { slug: 'privacy-policy', title: 'Privacy Policy', body: '<p>We respect your privacy. Your data is never sold.</p>' },
    { slug: 'terms-conditions', title: 'Terms & Conditions', body: '<p>By using Modern Commerce you agree to these terms.</p>' },
    { slug: 'faq', title: 'Frequently Asked Questions', body: '<p>Find answers to common questions here.</p>' },
    { slug: 'contact', title: 'Contact Us', body: '<p>Reach us at support@example.com.</p>' },
  ];
  for (const page of pages) {
    await prisma.contentPage.upsert({
      where: { slug: page.slug },
      update: { body: page.body, visibility: 'VISIBLE', publishedAt: new Date() },
      create: { ...page, visibility: 'VISIBLE', publishedAt: new Date() },
    });
  }

  const sections = [
    { type: 'HERO', title: 'Discover the Future of Shopping', subtitle: 'Premium products, delivered fast.', displayOrder: 1 },
    { type: 'CATEGORIES', title: 'Shop by Category', displayOrder: 2 },
    { type: 'BEST_SELLERS', title: 'Best Sellers', displayOrder: 3 },
    { type: 'NEW_ARRIVALS', title: 'New Arrivals', displayOrder: 4 },
    { type: 'PROMOTIONAL', title: 'Season Sale — up to 40% off', displayOrder: 5 },
    { type: 'TESTIMONIALS', title: 'What our customers say', displayOrder: 6 },
    { type: 'NEWSLETTER', title: 'Stay in the loop', subtitle: 'Get offers and new arrivals first.', displayOrder: 7 },
  ];
  for (const s of sections) {
    const existingSection = await prisma.homepageSection.findFirst({ where: { type: s.type, displayOrder: s.displayOrder } });
    if (!existingSection) {
      await prisma.homepageSection.create({ data: { ...s, config: {}, isActive: true } });
    }
  }

  const testimonials = [
    { author: 'Ama K.', role: 'Verified Buyer', content: 'Absolutely love the quality. Delivery was fast and well packaged.', rating: 5, displayOrder: 1 },
    { author: 'Kwame B.', role: 'Verified Buyer', content: 'Seamless checkout and great customer support. Highly recommend.', rating: 5, displayOrder: 2 },
    { author: 'Efua M.', role: 'Verified Buyer', content: 'Beautiful products, fair prices. My go-to store now.', rating: 4, displayOrder: 3 },
  ];
  for (const t of testimonials) {
    const existingTestimonial = await prisma.testimonial.findFirst({ where: { author: t.author } });
    if (!existingTestimonial) {
      await prisma.testimonial.create({ data: { ...t, isActive: true } });
    }
  }

  const existingNav = await prisma.navigationMenu.findFirst({ where: { location: 'header' } });
  if (!existingNav) {
    await prisma.navigationMenu.create({
      data: {
        name: 'Main Navigation', location: 'header', isActive: true,
        items: [
        { label: 'Shop', href: '/products' },
        { label: 'Electronics', href: '/products?category=electronics' },
        { label: 'Fashion', href: '/products?category=fashion' },
        { label: 'Home', href: '/products?category=home-living' },
        { label: 'About', href: '/about' },
      ],
    },
  });
  }
}

async function main() {
  await seedRolesAndPermissions();
  await seedAdmin();
  await seedInfrastructure();
  await seedDevCatalog();
  await seedContent();
  console.log('Seed complete. Admin login:', { email: ADMIN_EMAIL });
  void ADMIN_PASSWORD;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
