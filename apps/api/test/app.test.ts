import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { schools } from '../../../packages/contracts/index.js';
import { createApp } from '../src/app.js';

const server = createApp().listen(0, '127.0.0.1');
let baseUrl: string;

before(async () => {
  if (!server.listening) await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('health and the shared school catalog are available without MongoDB', async () => {
  const health = await fetch(baseUrl + '/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { api: 'ok', database: 'not_configured' });

  const catalog = await fetch(baseUrl + '/schools');
  assert.equal(catalog.status, 200);
  assert.deepEqual(await catalog.json(), schools);
});

test('data endpoints return the existing unavailable response without MongoDB', async () => {
  for (const path of ['/me', '/documents', '/admin/overview']) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, 503, path);
    assert.deepEqual(await response.json(), { error: 'MongoDB chưa kết nối.' });
  }
});
