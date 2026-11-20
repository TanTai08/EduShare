import { fail } from '../../middlewares/errors.js';

export async function aiReply(instructions: string, content: object[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fail(503, 'Chưa cấu hình AI trên máy chủ.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', instructions, input: [{ role: 'user', content }], max_output_tokens: 700 }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) return fail(502, 'Dịch vụ AI chưa phản hồi thành công.');
  const result = await response.json() as { output?: { content?: { text?: string }[] }[] };
  return result.output?.flatMap(o => o.content ?? []).map(c => c.text ?? '').join('') || fail(502, 'AI chưa trả về nội dung.');
}
