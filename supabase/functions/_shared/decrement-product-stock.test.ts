import { decrementProductsStock, type StockDecrementLine } from "./decrement-product-stock.ts";

Deno.test("decrementProductsStock ignore lignes invalides", async () => {
  const updates: Array<{ id: string; stock: number }> = [];
  const supabase = {
    from() {
      return {
        select() {
          return this;
        },
        eq(_col: string, id: string) {
          return {
            maybeSingle: async () => ({
              data: { id, stock: 10, code_alsafix: "TEST1" },
              error: null,
            }),
          };
        },
        update(payload: { stock: number }) {
          return {
            eq: async (_c: string, id: string) => {
              updates.push({ id, stock: payload.stock });
              return { error: null };
            },
          };
        },
      };
    },
  };

  const lines: StockDecrementLine[] = [
    { product_id: "00000000-0000-4000-8000-000000000001", quantity: 3 },
    { product_id: "bad-id", quantity: 5 },
    { product_id: "00000000-0000-4000-8000-000000000001", quantity: 2 },
  ];

  const result = await decrementProductsStock(supabase as never, lines);
  if (result.products_updated !== 1) {
    throw new Error(`expected 1 product updated, got ${result.products_updated}`);
  }
  if (updates[0]?.stock !== 5) {
    throw new Error(`expected stock 5, got ${updates[0]?.stock}`);
  }
});
