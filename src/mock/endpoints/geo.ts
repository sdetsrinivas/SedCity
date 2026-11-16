import geo from "../data/geo.json";
import { call } from "../api";

export type Zone = (typeof geo.zones)[number];
export type Ward = (typeof geo.wards)[number];
export type Street = (typeof geo.streets)[number];

export const zones = geo.zones;
export const wardsOf = (zoneId: string) => geo.wards.filter((w) => w.zoneId === zoneId);
export const streetsOf = (wardId: string) => geo.streets.filter((s) => s.wardId === wardId);
export const wardById = (id: string) => geo.wards.find((w) => w.id === id);
export const streetById = (id: string) => geo.streets.find((s) => s.id === id);

export const listZones = () => call("ZONE_LIST", () => zones);
export const listWards = (zoneId: string) => call("WARD_LIST", () => wardsOf(zoneId));
export const listStreets = (wardId: string) => call("STREET_LIST", () => streetsOf(wardId));
