import assert from 'node:assert/strict';
import test from 'node:test';
import { startupError } from '../src/config/startup-error.js';
import { readSource, sources } from '../src/modules/academic/sources.js';

test('Đông Á import keeps the Đà Nẵng code and groups marked specializations', () => {
  const imported = readSource(sources.donga, `<table>
    <tr><th rowspan="2">TT</th><th colspan="2">Mã xét tuyển tại</th><th rowspan="2">Ngành, chuyên ngành đào tạo</th></tr>
    <tr><th>Đà Nẵng</th><th>Đắk Lắk</th></tr>
    <tr><td>1</td><td>120</td><td>120DL</td><td>Công nghệ thông tin</td></tr>
    <tr><td>2</td><td>1201</td><td>1201DL</td><td>Quản trị CNTT trong doanh nghiệp (*)</td></tr>
    <tr><td>3</td><td></td><td>199DL</td><td>Ngành chỉ ở Đắk Lắk</td></tr>
  </table>`);
  const programs = imported.get('donga')!;
  assert.equal(programs.size, 1);
  const major = programs.get('cong-nghe-thong-tin')!;
  assert.equal(major.code, '120');
  assert.deepEqual(major.specializations, [{ id: '1201', name: 'Quản trị CNTT trong doanh nghiệp' }]);
});

test('unreadable source reports a failure instead of yielding an empty catalog', () => {
  assert.throws(() => readSource(sources.donga, '<h1>Service unavailable</h1>'), /Không tìm thấy/);
});

test('startup diagnostics identify the MongoDB stage without printing driver messages', () => {
  const acl = startupError('catalog-seed', { code: 13, message: 'sensitive driver details' });
  assert.match(acl, /Ghi danh mục.*mã 13/);
  assert.doesNotMatch(acl, /sensitive/);
  assert.match(startupError('connection', { name: 'MongooseServerSelectionError' }), /Network Access/);
});
