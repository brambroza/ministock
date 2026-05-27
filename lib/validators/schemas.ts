import { z } from "zod";

export const productSchema = z.object({
  barcode: z.string().min(1),
  sku: z.string().optional(),
  product_name: z.string().min(1),
  description: z.string().optional(),
  unit_id: z.string().uuid(),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  storage_location_id: z.string().uuid().optional().nullable(),
  min_stock_qty: z.coerce.number().min(0),
  opening_balance: z.coerce.number().min(0).optional(),
  image_url: z.string().url().optional().nullable()
});

export const unitSchema = z.object({
  unit_code: z.string().min(1),
  unit_name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true)
});

export const locationSchema = z.object({
  location_code: z.string().min(1),
  location_name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true)
});

export const stockTxnSchema = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit_cost: z.coerce.number().min(0).optional(),
  remark: z.string().optional(),
  reference_no: z.string().optional()
});
