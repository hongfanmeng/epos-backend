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

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async create(ctx) {
      const result = OrderCreate.safeParse(ctx.request.body.data);

      if (!result.success) {
        const { error } = result as SafeParseError<any>;
        return ctx.badRequest("invalid data format", { detail: error.message });
      }

      const { data } = result;

      const productIds = data.items.map((item) => item.product);

      const products = await strapi.entityService.findMany(
        "api::product.product",
        {
          fields: ["id", "title", "price"],
          filters: { id: { $in: productIds } },
          populate: ["optionGroups.options"],
        }
      );

      const items = data.items.map((item) => {
        const { quantity, product: productId } = item;
        const product = products.find((p) => p.id == productId);
        return {
          title: product.title,
          amount: product.price * quantity,
          quantity,
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
