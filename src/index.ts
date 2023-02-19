import { faker } from "@faker-js/faker";
import { Strapi } from "@strapi/strapi";
import _ from "lodash";

const generateItems = ({ minCount: min, maxCount: max, generator }) => {
  return _.range(faker.datatype.number({ min, max })).map(() => generator());
};

const randomChoice = (arr: any[]) => {
  return arr.at(faker.datatype.number({ max: arr.length }));
};

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Strapi }) {
    // check if categories exists
    const categories = await strapi.entityService.findMany(
      "api::category.category",
      { fields: ["id"] }
    );
    if (categories.length < 10) {
      // gen categories
      for (let i = 0; i < 10; i++) {
        await strapi.entityService.create("api::category.category", {
          data: {
            title: faker.word.noun(),
            publishedAt: faker.date.past(),
          },
        });
      }
    }
    const optionGroups = await strapi.entityService.findMany(
      "api::option-group.option-group",
      { fields: ["id"] }
    );
    if (optionGroups.length < 20) {
      // gen option groups
      for (let i = 0; i < 20; i++) {
        let minCount = faker.datatype.number({ max: 5 });
        let maxCount = faker.datatype.number({ min: minCount, max: 6 });
        await strapi.entityService.create("api::option-group.option-group", {
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
      }
    }
    // check if products exists
    const products = await strapi.entityService.findMany(
      "api::product.product",
      { fields: ["id"] }
    );
    if (products.length < 100) {
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
      for (let i = 0; i < 100; i++) {
        await strapi.entityService.create("api::product.product", {
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
        });
      }
    }
  },
};
