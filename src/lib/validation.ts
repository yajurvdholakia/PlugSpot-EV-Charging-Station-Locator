import { z } from "zod";

// Allowed enum values — keep in sync with the Prisma schema comments.
export const STATION_STATUSES = ["OPERATIONAL", "MAINTENANCE", "OFFLINE"] as const;
export const CONNECTOR_TYPES = ["CCS", "Type2", "CHAdeMO", "BharatAC"] as const;

// Schema for creating a station (admin only).
// All numeric fields are coerced + range-checked so garbage input can't
// produce NaN or absurd values in the database.
export const stationCreateSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  operator: z.string().min(1).max(80),
  address: z.string().min(3).max(300),
  area: z.string().max(80).optional().default(""),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional().default("Gujarat"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  status: z.enum(STATION_STATUSES).optional().default("OPERATIONAL"),
  connectorTypes: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .default([]),
  powerKW: z.coerce.number().min(0).max(500).optional().default(0),
  pricePerKWh: z.coerce.number().min(0).max(100).optional().default(0),
  numberOfPorts: z.coerce.number().int().min(1).max(50).optional().default(1),
  availablePorts: z.coerce.number().int().min(0).max(50).optional(),
  amenities: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .default(""),
  hours: z.string().max(40).optional().default("24/7"),
  phone: z.string().max(30).optional().nullable(),
  image: z.string().url().max(500).optional().nullable().or(z.literal("")),
});

// Schema for updating a station — all fields optional, but if present they
// must pass the same rules as create.
export const stationUpdateSchema = stationCreateSchema.partial();

export type StationCreateInput = z.infer<typeof stationCreateSchema>;
export type StationUpdateInput = z.infer<typeof stationUpdateSchema>;

// Normalise array/string fields to a CSV string for SQLite storage.
export function toCsv(value: string[] | string | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(",");
  return value;
}
