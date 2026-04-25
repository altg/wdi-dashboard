import { z } from "zod";

export const WBMetaSchema = z.object({
  page: z.coerce.number(),
  pages: z.coerce.number(),
  per_page: z.coerce.number(),
  total: z.coerce.number(),
  sourceid: z.string().optional(),
  lastupdated: z.string().optional(),
});

export const WBObservationSchema = z.object({
  indicator: z.object({ id: z.string(), value: z.string() }),
  country: z.object({ id: z.string(), value: z.string() }),
  countryiso3code: z.string(),
  date: z.string(),
  value: z.number().nullable(),
  unit: z.string().optional(),
  obs_status: z.string().optional(),
  decimal: z.number().optional(),
});

export const WBResponseSchema = z.tuple([
  WBMetaSchema,
  z.array(WBObservationSchema).nullable(),
]);

export const WBCountrySchema = z.object({
  id: z.string(),
  iso2Code: z.string(),
  name: z.string(),
  region: z.object({ id: z.string(), value: z.string() }),
  incomeLevel: z.object({ id: z.string(), value: z.string() }),
  lendingType: z.object({ id: z.string(), value: z.string() }).optional(),
  capitalCity: z.string().optional(),
});

export const WBCountryResponseSchema = z.tuple([
  WBMetaSchema,
  z.array(WBCountrySchema).nullable(),
]);

export const WBIndicatorMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string().optional(),
  source: z.object({ id: z.string(), value: z.string() }).optional(),
  sourceNote: z.string().optional(),
  topics: z.array(z.object({ id: z.string(), value: z.string() })).optional(),
});

export const WBIndicatorMetaResponseSchema = z.tuple([
  WBMetaSchema,
  z.array(WBIndicatorMetaSchema).nullable(),
]);

export type WBMeta = z.infer<typeof WBMetaSchema>;
export type WBObservation = z.infer<typeof WBObservationSchema>;
export type WBCountry = z.infer<typeof WBCountrySchema>;
export type WBIndicatorMeta = z.infer<typeof WBIndicatorMetaSchema>;
