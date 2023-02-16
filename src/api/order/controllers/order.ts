/**
 * order controller
 */

import { factories } from "@strapi/strapi";
import { SafeParseError, z } from "zod";

const OrderCreate = z.object({
  remark: z.string().optional(),
  items: z.array(
    z.object({
      product: z.number(),
      quantity: z.number(),
      options: z.number().array().optional(),
    })
  ),
});

type Product = {
  id: number;
  title: string;
  price: number;
  optionGroups: {
    id: number;
    title: string;
    minCount: number;
    maxCount: number;
    options: {
      id: number;
      title: string;
      price: number;
    }[];
  }[];
};
type OrderOption = { title: string; groupTitle: string };

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async create(ctx) {
      const body = ctx.request.body as { data?: z.infer<typeof OrderCreate> };
      const result = OrderCreate.safeParse(body?.data);

      if (!result.success) {
        const { error } = result as SafeParseError<any>;
        return ctx.badRequest("invalid data format", { detail: error.message });
      }

      const { data } = result;

      const productIds = data.items.map((item) => item.product);

      const products = (await strapi.entityService.findMany(
        "api::product.product",
        {
          fields: ["id", "title", "price"],
          filters: { id: { $in: productIds } },
          populate: ["optionGroups.options"],
          publicationState: "live",
        }
      )) as Product[];

      if (products.length != new Set(productIds).size) {
        return ctx.badRequest("invalid product");
      }

      const items = data.items.map((item) => {
        const { quantity, product: productId, options: optionIds } = item;
        const product = products.find((p) => p.id == productId);
        const optionGroups = product.optionGroups;
        let price = product.price;
        let options = [] as OrderOption[];
        optionGroups.forEach((group) => {
          // filter options that in group
          const optionsOfGroup = group.options.filter((option) =>
            optionIds.includes(option.id)
          );
          // check option within range
          if (
            group.minCount > optionsOfGroup.length ||
            (group.maxCount && group.maxCount < optionsOfGroup.length)
          ) {
            return ctx.badRequest("invalid options count");
          }
          // calc option price
          price += optionsOfGroup.reduce(
            (sum, option) => sum + (option.price ?? 0),
            0
          );
          // add options to item
          options.push(
            ...optionsOfGroup.map((option) => ({
              title: option.title,
              groupTitle: group.title,
            }))
          );
        });

        return {
          title: product.title,
          amount: price * quantity,
          quantity,
          options,
          publishedAt: new Date(),
        };
      });

      const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
      const total = subTotal;
      const remark = data.remark;

      const order = await strapi.entityService.create("api::order.order", {
        data: {
          subTotal,
          total,
          items,
          remark,
          publishedAt: new Date(),
        },
        populate: ["items.options"],
      });

      const sanitizedEntity = await this.sanitizeOutput(order, ctx);
      return this.transformResponse(sanitizedEntity);
    },
  })
);
