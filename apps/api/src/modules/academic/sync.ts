import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import { bundledCatalog, catalogInput, writeCatalog } from './catalog.js';
import { readSource, sources, sourceSchools, type SourcedMajor } from './sources.js';

async function download(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'EduShare academic catalog importer' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.text();
}

async function main() {
  const { values } = parseArgs({ options: {
    source: { type: 'string', multiple: true },
    output: { type: 'string' },
    apply: { type: 'boolean' },
    bundled: { type: 'boolean' },
  } });
  if (values.bundled && values.source) throw new Error('Chọn --bundled hoặc --source.');
  const ids = values.source ?? Object.keys(sources);
  for (const id of ids) {
    if (!Object.hasOwn(sources, id)) throw new Error('Nguồn không tồn tại: ' + id);
  }

  // Keep the checked-in data if an official page cannot be fetched or changes format.
  const catalog = new Map(bundledCatalog.map(school => [school.id, {
    ...school, majors: new Map(school.majors.map(major => [major.id, major])),
  }]));
  const updated = new Map<string, Map<string, SourcedMajor>>();
  let failures = 0;
  if (!values.bundled) {
    const results = await Promise.allSettled(ids.map(async id => readSource(sources[id], await download(sources[id].url))));
    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        console.error(ids[index] + ': ' + (result.reason?.message ?? 'Không đọc được nguồn'));
        failures++;
        continue;
      }
      for (const [schoolId, majors] of result.value) {
        const additions = updated.get(schoolId) ?? new Map();
        for (const [id, major] of majors) {
          // Earlier sources are preferred for the name and code; additional tracks can supplement them.
          const previous = additions.get(id);
          const tracks = new Map([...major.specializations, ...(previous?.specializations ?? [])].map(item => [item.id, item]));
          additions.set(id, { ...major, ...previous, code: previous?.code ?? major.code, specializations: [...tracks.values()] });
        }
        updated.set(schoolId, additions);
      }
      const count = [...result.value.values()].reduce((total, majors) => total + majors.size, 0);
      console.log(ids[index] + ': ' + count + ' ngành từ ' + result.value.size + ' trường.');
    }
    if (!updated.size) throw new Error('Không có nguồn nào đọc được. Dùng --bundled để nhập bộ dữ liệu đi kèm.');
  }

  for (const [schoolId, majors] of updated) {
    const school = sourceSchools.find(item => item.id === schoolId);
    if (!school) throw new Error('Thiếu thông tin cơ sở cho ' + schoolId);
    const existing = catalog.get(schoolId)?.majors ?? new Map<string, SourcedMajor>();
    for (const [id, major] of majors) {
      const tracks = new Map([...(existing.get(id)?.specializations ?? []), ...major.specializations].map(item => [item.id, item]));
      existing.set(id, { ...major, specializations: [...tracks.values()] });
    }
    catalog.set(schoolId, { ...school, majors: existing });
  }

  const snapshot = catalogInput.parse([...catalog.values()].sort((a, b) => a.id.localeCompare(b.id)).map(school => ({
    ...school,
    majors: [...school.majors.values()].sort((a, b) => a.id.localeCompare(b.id)).map(major => ({
      ...major, specializations: [...major.specializations].sort((a, b) => a.id.localeCompare(b.id)),
    })),
  })));
  const count = snapshot.reduce((total, school) => total + school.majors.length, 0);
  console.log(snapshot.length + ' trường/cơ sở · ' + count + ' ngành trong bộ dữ liệu.');
  if (values.output) await writeFile(values.output, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  if (values.apply) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('Cần đặt MONGODB_URI trong apps/api/.env để ghi MongoDB.');
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
      await writeCatalog(values.bundled ? snapshot : snapshot.flatMap(school => {
        const offerings = updated.get(school.id);
        return offerings ? [{ ...school, majors: [...offerings.values()] }] : [];
      }), !!values.bundled);
      console.log('Đã cập nhật MongoDB. Khởi động lại API để tải danh mục mới.');
    } catch {
      throw new Error('Không ghi được MongoDB. Kiểm tra kết nối và quyền ghi.');
    } finally {
      await mongoose.disconnect();
    }
  }
  if (failures) {
    console.error(failures + ' nguồn cần kiểm tra. Dữ liệu đã xác minh trước đó được giữ lại.');
    process.exitCode = 1;
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
