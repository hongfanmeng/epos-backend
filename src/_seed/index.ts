import { Strapi } from "@strapi/strapi";
import { seedUserExists, createSeedUser } from "./user";
import { generateItems, randomChoice } from "./helpers";
import { faker } from "@faker-js/faker";
import _ from "lodash";

export const generateSeedData = async (strapi: Strapi) => {
  // check if seed has gen
  if (await seedUserExists(strapi)) {
    console.log("skipping seed data generation...");
    return;
  }
  await createSeedUser(strapi);

  // gen categories
  await Promise.all(
    _.range(10).map(() =>
      strapi.entityService.create("api::category.category", {
        data: {
          title: faker.word.noun(),
          publishedAt: faker.date.past(),
        },
      })
    )
  );

  // gen option groups
  await Promise.all(
    _.range(20).map(() => {
      let minCount = faker.datatype.number({ max: 5 });
      let maxCount = faker.datatype.number({ min: minCount, max: 6 });
      return strapi.entityService.create("api::option-group.option-group", {
        data: {
          title: faker.word.noun(),
          minCount,
          maxCount,
          options: generateItems({
            minCount: maxCount,
            maxCount: 10,
            generator: () => ({
              title: faker.word.noun(),
              price: faker.datatype.float({ min: 0, max: 10 }),
            }),
          }),
          publishedAt: faker.date.past(),
        },
      });
    })
  );

  // get all categories and option groups
  const categoryIds = (
    await strapi.entityService.findMany("api::category.category", {
      fields: ["id"],
    })
  ).map((c) => c.id) as number[];
  const optionGroupIds = (
    await strapi.entityService.findMany("api::option-group.option-group", {
      fields: ["id"],
    })
  ).map((og) => og.id) as number[];

  // gen products
  await Promise.all(
    _.range(100).map(() =>
      strapi.entityService.create("api::product.product", {
        data: {
          title: faker.word.noun(),
          description: faker.lorem.paragraph(),
          price: faker.datatype.float({ min: 0, max: 100 }),
          category: randomChoice(categoryIds),
          optinoGroups: generateItems({
            minCount: 1,
            maxCount: 5,
            generator: () => randomChoice(optionGroupIds),
          }),
          publishedAt: faker.date.past(),
        },
      })
    )
  );
};
