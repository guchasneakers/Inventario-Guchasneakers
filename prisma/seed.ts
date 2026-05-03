import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    modelNum: "MODELO #01",
    name: "Air Jordan 5 Retro OG Black Metallic Reimagined",
    description: "Clásico silhouette con detalles metálicos. Edición reimaginada.",
    price: 220,
    imageUrl:
      "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/99d22059-cf33-494e-b9af-dcb790bc95c2/AIR+JORDAN+5+RETRO+OG.png",
    sizes: [
      { number: "5",   quantity: 1, sold: 0 },
      { number: "6",   quantity: 1, sold: 0 },
      { number: "6.5", quantity: 1, sold: 0 },
      { number: "7",   quantity: 2, sold: 0 },
      { number: "7.5", quantity: 1, sold: 0 },
      { number: "8",   quantity: 1, sold: 0 },
      { number: "8.5", quantity: 2, sold: 0 },
      { number: "9",   quantity: 1, sold: 0 },
      { number: "9.5", quantity: 2, sold: 0 },
      { number: "10",  quantity: 1, sold: 0 },
      { number: "11",  quantity: 1, sold: 0 },
      { number: "12",  quantity: 1, sold: 0 },
    ],
  },
  {
    modelNum: "MODELO #02",
    name: "Air Jordan 11 Retro Gamma Blue",
    description: "Icónico Jordan 11 en colorway Gamma Blue con patente.",
    price: 250,
    imageUrl:
      "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/aa4b1e24-b1a0-4c7e-9aa5-8cef7ee73c40/AIR+JORDAN+11+RETRO.png",
    sizes: [
      { number: "6",   quantity: 1, sold: 0 },
      { number: "7",   quantity: 1, sold: 0 },
      { number: "7.5", quantity: 1, sold: 0 },
      { number: "8",   quantity: 1, sold: 0 },
      { number: "8.5", quantity: 2, sold: 0 },
      { number: "9",   quantity: 1, sold: 0 },
      { number: "9.5", quantity: 1, sold: 0 },
      { number: "10",  quantity: 1, sold: 0 },
    ],
  },
  {
    modelNum: "MODELO #03",
    name: "Air Jordan 5 Retro Fire Red",
    description: "El legendario Fire Red regresa. Tongue de malla translúcida.",
    price: 215,
    imageUrl:
      "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/5afab5c5-46f0-4e11-9b75-5a55ad067bb0/AIR+JORDAN+5+RETRO.png",
    sizes: [
      { number: "5",   quantity: 1, sold: 0 },
      { number: "6",   quantity: 1, sold: 0 },
      { number: "6.5", quantity: 1, sold: 0 },
      { number: "7",   quantity: 1, sold: 0 },
      { number: "7.5", quantity: 1, sold: 0 },
      { number: "8",   quantity: 1, sold: 0 },
      { number: "8.5", quantity: 2, sold: 0 },
      { number: "9",   quantity: 1, sold: 0 },
      { number: "9.5", quantity: 2, sold: 0 },
      { number: "10",  quantity: 1, sold: 0 },
      { number: "11",  quantity: 1, sold: 0 },
    ],
  },
  {
    modelNum: "MODELO #04",
    name: "Air Jordan 5 Retro Wolf Grey",
    description: "Colorway Wolf Grey con detalles plateados y suela translúcida.",
    price: 210,
    imageUrl:
      "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/cf4b5bb2-b3b8-47f0-8a97-34ec5c8d2abd/AIR+JORDAN+5+RETRO.png",
    sizes: [
      { number: "4",   quantity: 1, sold: 0 },
      { number: "5",   quantity: 1, sold: 0 },
      { number: "6",   quantity: 1, sold: 0 },
      { number: "6.5", quantity: 1, sold: 0 },
      { number: "7",   quantity: 2, sold: 0 },
      { number: "7.5", quantity: 1, sold: 0 },
      { number: "8",   quantity: 2, sold: 0 },
      { number: "8.5", quantity: 1, sold: 0 },
      { number: "9",   quantity: 1, sold: 0 },
      { number: "9.5", quantity: 2, sold: 0 },
      { number: "10",  quantity: 1, sold: 0 },
      { number: "11",  quantity: 1, sold: 0 },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.size.deleteMany();
  await prisma.product.deleteMany();

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        modelNum:    p.modelNum,
        name:        p.name,
        description: p.description,
        price:       p.price,
        imageUrl:    p.imageUrl,
        sizes: {
          create: p.sizes,
        },
      },
    });
    console.log(`  ✓ ${product.modelNum}: ${product.name}`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
