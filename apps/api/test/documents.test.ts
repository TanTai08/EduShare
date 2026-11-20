import assert from 'node:assert/strict';
import test from 'node:test';
import { listing } from '../src/modules/documents/validation.js';

const textbook = {
  title: 'Giáo trình', subject: 'Lập trình WEB', category: 'Công nghệ thông tin',
  description: 'Giáo trình bản in có ghi chú.', type: 'sale', price: 25_000,
};

test('publishing with a blank description identifies the field in Vietnamese', () => {
  const result = listing.safeParse({ ...textbook, description: '   ' });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues.map(({ path, message }) => ({ path, message })), [
      { path: ['description'], message: 'Vui lòng điền mô tả.' },
    ]);
  }
  assert.equal(listing.parse(textbook).price, 25_000);
});

test('free documents accept an uploaded PDF or an HTTPS link', () => {
  const digital = { ...textbook, type: 'digital', price: 0 };
  const pdf = Buffer.from('%PDF-1.4\n').toString('base64');
  assert.equal(listing.parse({ ...digital, pdf }).pdf, pdf);
  assert.equal(listing.parse({ ...digital, fileUrl: ' https://example.com/notes.pdf ' }).fileUrl, 'https://example.com/notes.pdf');
  assert.equal(listing.safeParse(digital).success, false);
  assert.equal(listing.safeParse({ ...digital, fileUrl: 'http://example.com/notes.pdf' }).success, false);
  assert.equal(listing.safeParse({ ...textbook, pdf }).success, false);
});
