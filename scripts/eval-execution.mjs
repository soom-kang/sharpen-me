import { sanitize } from './eval-observation.mjs';
export const evidenceLimitBytes = 8192;

export function boundedEvidence(value, fixtureRoot) {
  if (typeof value !== 'string') return { text: '', missing: true, truncated: false };
  const cleaned = sanitize(value, fixtureRoot);
  const bytes = Buffer.from(cleaned);
  let end = Math.min(bytes.length, evidenceLimitBytes);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text;
  while (text === undefined) {
    try { text = decoder.decode(bytes.subarray(0, end)); }
    catch { end--; }
  }
  return { text, missing: false, truncated: bytes.length > end };
}

// Record completed command events only, never initialization or account events.
export function executionEvidence(provider, events, fixtureRoot) {
  const evidence = [], pending = new Map();
  const add = (command, output, status) => evidence.push({ command: boundedEvidence(command, fixtureRoot),
    output: boundedEvidence(output, fixtureRoot), ...status });
  for (const event of events) {
    if (provider === 'codex' && event.type === 'item.completed' && event.item?.type === 'command_execution') {
      add(event.item.command, event.item.aggregated_output, { exitCode: event.item.exit_code ?? null, success: event.item.exit_code === 0 });
    }
    if (provider === 'claude' && event.type === 'assistant') {
      for (const block of event.message?.content ?? []) {
        if (block.type === 'tool_use' && block.name === 'Bash') pending.set(block.id, block.input?.command);
      }
    }
    if (provider === 'claude' && event.type === 'user') {
      for (const block of event.message?.content ?? []) {
        if (block.type !== 'tool_result' || !pending.has(block.tool_use_id)) continue;
        const output = typeof block.content === 'string' ? block.content : Array.isArray(block.content)
          ? block.content.filter(c => c.type === 'text').map(c => c.text ?? '').join('\n') : undefined;
        add(pending.get(block.tool_use_id), output, { exitCode: null, success: !block.is_error });
        pending.delete(block.tool_use_id);
      }
    }
  }
  for (const command of pending.values()) add(command, undefined, { exitCode: null, success: false });
  return evidence;
}
