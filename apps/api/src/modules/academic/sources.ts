import { load, type CheerioAPI } from 'cheerio';
import type { AcademicMajor, AcademicRegion, AcademicSchool } from '../../../../../packages/contracts/index.js';

type Offering = { schoolId: string; name: string; code?: string; track?: string; trackCode?: string };
type Source = { url: string; year?: number; parse: ($: CheerioAPI) => Offering[] };

const daNang = 'Đà Nẵng';
const udnSchools: Record<string, [string, string]> = {
  DDK: ['dut', 'Đại học Bách khoa – Đại học Đà Nẵng'],
  DDQ: ['due', 'Đại học Kinh tế – Đại học Đà Nẵng'],
  DDF: ['ufl', 'Đại học Ngoại ngữ – Đại học Đà Nẵng'],
  DDS: ['ued', 'Đại học Sư phạm – Đại học Đà Nẵng'],
  DSK: ['ute', 'Đại học Sư phạm Kỹ thuật – Đại học Đà Nẵng'],
  VKU: ['vku', 'Đại học CNTT và Truyền thông Việt – Hàn'],
  DDY: ['smp', 'Trường Y Dược – Đại học Đà Nẵng'],
  DDV: ['vnuk', 'Viện Nghiên cứu và Đào tạo Việt – Anh'],
};
const independentSchools: [string, string][] = [
  ['donga', 'Đại học Đông Á'],
  ['duytan', 'Đại học Duy Tân'],
  ['fpt-danang', 'Đại học FPT – Cơ sở Đà Nẵng'],
  ['dau', 'Đại học Kiến trúc Đà Nẵng'],
  ['dsu', 'Đại học Thể dục Thể thao Đà Nẵng'],
  ['ydn', 'Đại học Kỹ thuật Y – Dược Đà Nẵng'],
  ['phan-chau-trinh', 'Đại học Phan Châu Trinh'],
];

export const sourceSchools: (AcademicSchool & { region: AcademicRegion['name'] })[] = [...Object.values(udnSchools), ...independentSchools]
  .map(([id, name]) => ({ id, name, region: daNang }));

const year = 2026;
const clean = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim();
export const key = (value: string) => value.normalize('NFD').toLowerCase().replace(/\p{M}/gu, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numericCode = /^\d{7}[A-Z0-9]*$/i;
const qualification = /\s*(?:\((?:kỹ sư|cử nhân)\)|[-–]\s*(?:kỹ sư|cử nhân))$/i;
const withoutQualification = (name: string) => name.replace(qualification, '').trim();
function splitTrack(name: string) {
  const [base, track] = withoutQualification(name).split(/\s*[-–,:]?\s*(?:\(\s*)?chuyên ngành\s*:?\s*/i, 2);
  return { name: base.trim(), track: track?.replace(/\)$/, '').trim() };
}

function tableRows($: CheerioAPI) {
  return $('table tr').map((_index, row) => [$(row).children('td,th').map((_cellIndex, cell) => clean($(cell).text())).get()]).get();
}

// The published results repeat admissions methods. The school header changes the scope of following rows.
function udnResults($: CheerioAPI): Offering[] {
  const offerings: Offering[] = [];
  let schoolId: string | undefined;
  for (const [serial, code, name] of tableRows($)) {
    if (!code || !name) continue;
    if (/^[IVXL]+$/.test(serial)) {
      schoolId = udnSchools[code.toUpperCase()]?.[0];
      continue;
    }
    if (schoolId && /^\d+[.]?$/.test(serial) && numericCode.test(code)) {
      const names = splitTrack(name);
      offerings.push({ schoolId, ...names, code, trackCode: names.track ? code : undefined });
    }
  }
  return offerings;
}

function codeVariants(schoolId: string, entries: { code: string; name: string }[]): Offering[] {
  const plainNames = new Map(entries.filter(entry => entry.code.length === 7).map(entry => [entry.code, withoutQualification(entry.name)]));
  return entries.map(({ code, name }) => {
    const parentCode = code.slice(0, 7);
    const base = code.length > 7 ? plainNames.get(parentCode) : undefined;
    if (!base) return { schoolId, code, name: withoutQualification(name) };
    const track = withoutQualification(name);
    return { schoolId, code: parentCode, name: base, trackCode: code, track: key(track) === key(base) ? undefined : track };
  });
}

export const sources: Record<string, Source> = {
  udn: {
    url: 'https://ts.udn.vn/DHCD/Chinhquy/diemchuan/19567', year, parse: udnResults,
  },
  udnStrategy: {
    url: 'https://ts.kontum.udn.vn/?act=chi-tiet-tin-tuc&rel=334-dai-hoc-da-Nang-co-hang-tram-nganh-chuong-trinh-dao-tao-duoc-huong-hoc-bong-theo-Nghi-dinh-179.html',
    year,
    parse: $ => tableRows($).flatMap(([serial, school, name, code, level]) => (
      /^\d+$/.test(serial) && ['DDK', 'DDQ', 'DDS'].includes(school) && numericCode.test(code ?? '') && level === 'Đại học'
        ? [{ schoolId: udnSchools[school][0], code, ...splitTrack(name) }] : [])),
  },
  vku: {
    url: 'https://tuyensinh.vku.udn.vn/', year,
    parse: $ => codeVariants('vku', $('.blog-entry').toArray().flatMap(card => {
      const name = clean($(card).find('h3.heading').text());
      const code = $(card).find('a[style*="storage/nganh"]').attr('style')?.match(/_(\d{7}[A-Z0-9]*)\./)?.[1];
      return name && code ? [{ name, code }] : [];
    })),
  },
  vnuk: {
    url: 'https://tuyensinh.vnuk.udn.vn/thong-tin-tuyen-sinh-nam-2026/', year,
    parse: $ => {
      const table = $('table').toArray().find(item => $(item).text().includes('Tên chương trình, ngành, nhóm ngành xét tuyển'));
      if (!table) return [];
      const rows = $(table).find('tr').map((_i, row) => [$(row).children('td').map((_j, cell) => clean($(cell).text())).get()]).get();
      return rows.flatMap(([, code, name]) => numericCode.test(code ?? '') ? [{ schoolId: 'vnuk', code, name }] : []);
    },
  },
  donga: {
    url: 'https://tuyensinhdonga.edu.vn/thong-tin-tuyen-sinh-dai-hoc-dong-a-nam-2026/', year,
    parse: $ => {
      const table = $('table').toArray().find(item => {
        const headings = clean($(item).find('tr').first().text());
        return headings.includes('Mã xét tuyển tại') && headings.includes('chuyên ngành đào tạo');
      });
      if (!table || !clean($(table).find('tr').eq(1).text()).startsWith('Đà Nẵng')) return [];
      const entries = $(table).find('tr').toArray().flatMap(row => {
        const [, code, , name] = $(row).children('td').map((_i, cell) => clean($(cell).text())).get();
        if (!/^\d{3,7}[A-Z]*$/.test(code ?? '') || !name) return [];
        return [{ code, name }];
      });
      const parents = new Map(entries.filter(item => !item.name.endsWith('(*)')).map(item => [item.code, item.name.replace(/\s*\(☆\)$/, '')]));
      return entries.map(({ code, name }) => {
        const base = name.endsWith('(*)') ? parents.get(code.slice(0, -1)) : undefined;
        return base ? { schoolId: 'donga', name: base, code: code.slice(0, -1), track: name.slice(0, -3).trim(), trackCode: code } :
          { schoolId: 'donga', code, name: name.replace(/\s*\((?:☆|\*)\)$/, '') };
      });
    },
  },
  duytan: {
    url: 'https://tuyensinh2026.duytan.edu.vn/', year,
    parse: $ => $('a[href^="/tuyen-sinh-nganh-"]').toArray().map(link => ({
      schoolId: 'duytan', name: clean($(link).text()).replace(/^Ngành\s+/i, ''),
    })),
  },
  dau: {
    url: 'https://tuyensinh.dau.edu.vn/truong-dai-hoc-kien-truc-da-nang-cong-bo-phuong-an-xet-tuyen-dai-hoc-nam-2026.html', year,
    parse: $ => {
      const menu = $('.nav-item > a').toArray().find(item => clean($(item).text()) === 'Ngành đào tạo');
      return menu ? $(menu).siblings('ul').find('li li > a').toArray().map(link => ({
        schoolId: 'dau', name: clean($(link).text()),
      })) : [];
    },
  },
  fpt: {
    url: 'https://daihoc.fpt.edu.vn/tuyen-sinh-dn/', year,
    parse: $ => {
      const codes: Record<string, string> = { 'cong-nghe-thong-tin': '7480201', 'quan-tri-kinh-doanh': '7340101', 'cong-nghe-truyen-thong': '7320106' };
      return $('.ladi-paragraph').toArray().flatMap(heading => {
        const text = clean($(heading).text());
        const name = text.replace(/^Ngành\s+/i, '');
        const code = /^Ngành\s+/.test(text) ? codes[key(name)] : undefined;
        if (!code) return [];
        const group = $(heading).parentsUntil('.ladi-container').toArray()
          .find(parent => $(parent).find('a[href*="/chuyen-nganh/"]').length > 0);
        if (!group) return [];
        const tracks = $(group).find('a[href*="/chuyen-nganh/"]').toArray().map(link => clean($(link).text()));
        return [{ schoolId: 'fpt-danang', name, code }, ...tracks.map(track => ({ schoolId: 'fpt-danang', name, code, track }))];
      });
    },
  },
  smp: {
    url: 'https://smp.udn.vn/thong-bao/tieu-diem-tuyen-sinh-sinh-vien-truong-y-duoc-dhdn-voi-nhieu-co-hoi-trao-doi-hoc-thuat-quoc-te',
    year: 2025,
    parse: $ => $('p,li').toArray().flatMap(item => {
      const text = clean($(item).text());
      const match = text.match(/^\d+\.\s+(.+?)\s*[-–]\s*Mã ngành:\s*(\d{7})$/i);
      if (!match) return [];
      const name = match[1].replace(/\s*\((?:bác sĩ|cử nhân|dược sĩ)[^()]*\)$/i, '');
      return [{ schoolId: 'smp', name, code: match[2] }];
    }),
  },
  ydn: {
    url: 'https://ydn.edu.vn/news-pages/phong-dao-tao-50/hoat-dong-chuyen-mon-ce10/chuong-trinh-dao-tao-c855',
    parse: $ => tableRows($).flatMap(([index, name, code]) => (
      /^\d+$/.test(index) && numericCode.test(code ?? '') ? [{ schoolId: 'ydn', name, code }] : [])),
  },
  due: {
    url: 'https://daotao.due.udn.vn/chuyen-nganh-dao-tao/',
    parse: $ => $('.page-chuyennganhdaotao .list-level-3').first().children('li').toArray().map(item => ({
      schoolId: 'due', name: clean($(item).text()),
    })),
  },
  ufl: {
    url: 'https://ktdbclgd.ufl.udn.vn/ket-qua-kiem-dinh-csgd/',
    parse: $ => tableRows($).flatMap(([index, title, , , , result]) => {
      if (!/^\d+$/.test(index) || !title || /^Thạc sĩ|^Tiến sĩ/.test(title) || result !== 'Đạt') return [];
      const [name, track] = title.replace(/\s*\(CLC\)$/, '').split(', ');
      return [{ schoolId: 'ufl', name, track }];
    }),
  },
  dsu: {
    url: 'https://dsu.edu.vn/tuyensinh/cau-hoi-thuong-gap', year,
    parse: $ => {
      const text = $('p').toArray().map(item => clean($(item).text())).find(item => /ngành gồm:.*\d{7}/.test(item)) ?? '';
      return [...text.matchAll(/(?:gồm:|,\s*)([^,(]+)\s*\((?:mã số\s*)?(\d{7})\)/gi)]
        .map(([, name, code]) => ({ schoolId: 'dsu', name: clean(name), code }));
    },
  },
  ute: {
    url: 'https://qldt.ute.udn.vn/chuong-trinh-dao-tao/dai-hoc', year,
    parse: $ => {
      const title = $('h4,h3').toArray().find(item => clean($(item).text()).endsWith('từ khóa đào tạo 2026'));
      if (!title) return [];
      return $(title).parent().next().find('a[href$=".pdf"]').toArray().map(link => {
        const title = withoutQualification(clean($(link).text()));
        const [, name, track] = title.match(/^(.+?)\s*\(([^()]+)\)$/) ?? [title, title];
        return { schoolId: 'ute', name: name.trim(), track };
      });
    },
  },
  phan: {
    url: 'https://pctu.edu.vn/vn/thong-tin-tuyen-sinh-dai-hoc-nam-2026.html', year,
    parse: $ => {
      const table = $('table').toArray().find(item => /Tên chương trình đào tạo.*Mã xét tuyển/.test(clean($(item).find('tr').first().text())));
      return table ? $(table).find('tr').toArray().flatMap(row => {
        const cells = $(row).children('td').map((_i, cell) => clean($(cell).text())).get();
        const [name, code] = cells.slice(-2);
        return numericCode.test(code ?? '') ? [{ schoolId: 'phan-chau-trinh', name, code }] : [];
      }) : [];
    },
  },
};

export type SourcedMajor = AcademicMajor & { sourceUrl: string; sourceYear?: number };

export function readSource(source: Source, html: string) {
  const result = new Map<string, Map<string, SourcedMajor>>();
  for (const { schoolId, name: rawName, code, track, trackCode } of source.parse(load(html))) {
    const name = clean(rawName);
    const id = key(name);
    if (!id || id.length > 120) continue;
    const majors = result.get(schoolId) ?? new Map<string, SourcedMajor>();
    const major = majors.get(id) ?? { id, code, name, specializations: [], sourceUrl: source.url, sourceYear: source.year };
    if (track && key(track) && key(track) !== id) {
      const trackId = key(trackCode || track);
      if (trackId.length <= 120 && !major.specializations.some(item => item.id === trackId)) {
        major.specializations.push({ id: trackId, name: clean(track) });
      }
    }
    majors.set(id, major);
    result.set(schoolId, majors);
  }
  if (!result.size) throw new Error('Không tìm thấy bảng hoặc danh mục ngành dự kiến.');
  return result;
}
