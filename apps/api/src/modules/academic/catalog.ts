import { readFileSync } from 'node:fs';
import { Schema, model } from 'mongoose';
import { z } from 'zod';
import { academicRegions, schools as legacySchools, type AcademicSchool } from '../../../../../packages/contracts/index.js';

const slug = z.string().regex(/^[a-z0-9-]+$/).max(120);
export const catalogInput = z.array(z.object({
  id: slug,
  name: z.string().trim().min(1),
  region: z.enum([academicRegions[0].name, academicRegions[1].name]),
  majors: z.array(z.object({
    id: slug,
    code: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1),
    specializations: z.array(z.object({ id: slug, name: z.string().trim().min(1) })),
    sourceUrl: z.string().url(),
    sourceYear: z.number().int().optional(),
  })),
}));

type Catalog = z.infer<typeof catalogInput>;
type Major = Catalog[number]['majors'][number];

const schoolModel = model('AcademicSchool', new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  region: { type: String, required: true },
}));
type StoredMajor = Omit<Major, 'id' | 'specializations'> & { _id: string; schoolId: string; tracks: Record<string, string> };
const majorModel = model('AcademicMajor', new Schema<StoredMajor>({
  _id: { type: String, required: true },
  schoolId: { type: String, required: true, index: true },
  code: String,
  name: { type: String, required: true },
  tracks: Schema.Types.Mixed,
  sourceUrl: String,
  sourceYear: Number,
}));

export const bundledCatalog = catalogInput.parse(JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8')));
let schools: AcademicSchool[] = [...legacySchools];
let majorsBySchool = new Map<string, Major[]>();
const alphabetical = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'vi');

export async function writeCatalog(catalog: Catalog, seed = false) {
  const schoolWrites = catalog.map(({ id, name, region }) => ({
    updateOne: { filter: { _id: id }, update: seed ? { $setOnInsert: { name, region } } : { $set: { name, region } }, upsert: true },
  }));
  const majorWrites = catalog.flatMap(school => school.majors.map(({ id, specializations, ...major }) => {
    const fields = { schoolId: school.id, ...major };
    const tracks = Object.fromEntries(specializations.map(item => [item.id, item.name]));
    const trackFields = Object.fromEntries(specializations.map(item => ['tracks.' + item.id, item.name]));
    return { updateOne: {
      filter: { _id: school.id + ':' + id },
      update: seed ? { $setOnInsert: { ...fields, tracks } } : { $set: { ...fields, ...trackFields } },
      upsert: true,
    } };
  }));
  if (schoolWrites.length) await schoolModel.bulkWrite(schoolWrites);
  if (majorWrites.length) await majorModel.bulkWrite(majorWrites);
}

export async function loadCatalog() {
  await writeCatalog(bundledCatalog, true);
  const [storedSchools, storedMajors] = await Promise.all([schoolModel.find().lean(), majorModel.find().lean()]);
  const byId = new Map<string, AcademicSchool>(legacySchools.map(school => [school.id, school]));
  for (const { _id, name, region } of storedSchools) byId.set(_id, { id: _id, name, region });
  schools = [...byId.values()].sort(alphabetical);

  const grouped = new Map<string, Major[]>();
  for (const major of storedMajors) {
    const { _id, schoolId, code, name, sourceUrl, sourceYear } = major;
    const items = grouped.get(schoolId) ?? [];
    const specializations = Object.entries(major.tracks ?? {}).map(([id, name]) => ({ id, name })).sort(alphabetical);
    items.push({ id: _id.slice(schoolId.length + 1), code, name, sourceUrl, sourceYear, specializations });
    grouped.set(schoolId, items);
  }
  for (const items of grouped.values()) items.sort(alphabetical);
  majorsBySchool = grouped;
}

export const listSchools = () => schools;
export const findSchool = (id?: string | null) => schools.find(entry => entry.id === id);
export const schoolIdsInRegion = (region?: string) => schools.filter(entry => entry.region === region).map(entry => entry.id);
export const listMajors = (schoolId?: string | null) => (schoolId && majorsBySchool.get(schoolId)) || [];
