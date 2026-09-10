export function parseEvents(text) {
  return text.split('\n').flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

// The frozen host asks to END with JSON, not to return JSON exclusively.
export function parseResponse(output) {
  const text = output.trim().replace(/\n```\s*$/, '');
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== '{') continue;
    try {
      const value = JSON.parse(text.slice(start));
      if (!value || typeof value.decision !== 'string' ||
          ['findings', 'evidence', 'limitations', 'changes'].some(k => !Array.isArray(value[k]) || value[k].some(v => typeof v !== 'string'))) continue;
      return value;
    } catch { /* Try the next possible start of the final JSON object. */ }
  }
  throw new Error('Missing final observation JSON or invalid field types');
}

export function observe(provider, result, skillName, skillText = '', options = {}) {
  const events = parseEvents(result.stdout);
  let output = '', usage = null, error = null, skillRead = false, providerCompleted = false;
  const reads = [];
  const actions = [];
  const pendingReads = new Map();
  const demonstratesContent = text => {
    // The Read tool places source bytes immediately after its line-number
    // delimiter. Removing another space would corrupt indented source lines.
    const normalized = text.split('\n').map(line => line.replace(/^\s*\d+(?:→|\t|\|)/, '')).join('\n');
    return skillText.trim() && normalized.includes(skillText.trim());
  };
  for (const event of events) {
    if (provider === 'codex') {
      const item = event.item;
      if (event.type === 'item.completed' && item?.type === 'agent_message') output = item.text ?? output;
      if (event.type === 'turn.completed') { usage = event.usage ?? null; providerCompleted = true; error = null; }
      if (event.type === 'error' || event.type === 'turn.failed') error = event.message ?? event.error?.message ?? 'Provider error';
      if (event.type === 'item.completed' && item?.type === 'command_execution') {
        const isSkillRead = item.exit_code === 0 && item.command?.includes(`${skillName}/SKILL.md`) && demonstratesContent(item.aggregated_output ?? '');
        if (isSkillRead) skillRead = true;
        actions.push({ kind: isSkillRead ? 'requested_skill_read' : /node[^\n]*--test/.test(item.command ?? '') ? 'test_command' : 'other_command', exitCode: item.exit_code });
        if (item.exit_code === 0) reads.push(item.command ?? '');
      }
    } else {
      if (event.type === 'result') {
        output = event.result ?? output;
        usage = event.usage ?? null;
        if (event.is_error || (event.subtype && event.subtype !== 'success')) error = (event.errors ?? [event.subtype]).join('; ');
        else { providerCompleted = true; error = null; }
      }
      if (event.type === 'assistant') {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'text') output = block.text ?? output;
          if (block.type === 'tool_use' && block.name === 'Read') {
            const file = block.input?.file_path ?? '';
            if (file.endsWith(`${skillName}/SKILL.md`)) pendingReads.set(block.id, file);
            reads.push(file);
          }
        }
      }
      if (event.type === 'user') {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'tool_result' && pendingReads.has(block.tool_use_id) && !block.is_error) {
            const contents = typeof block.content === 'string' ? block.content :
              (block.content ?? []).map(c => c.text ?? '').join('\n');
            if (demonstratesContent(contents)) { skillRead = true; actions.push({ kind: 'requested_skill_read', success: true }); }
          }
        }
      }
    }
  }
  let status = 'REVIEW_REQUIRED';
  let reason = null;
  const diagnostic = `${error ?? ''}\n${result.stderr}`;
  if (result.timedOut) { status = 'NOT_RUN'; reason = 'TIMEOUT'; }
  else if (result.overflow) { status = 'NOT_RUN'; reason = 'OUTPUT_LIMIT'; }
  else if (result.code !== 0 || error) {
    status = 'NOT_RUN';
    if (/auth|log.?in|credential|oauth|unauthorized|401/i.test(diagnostic)) reason = 'AUTH_ERROR';
    else if (/quota|rate.limit|usage.limit|budget|credit|429/i.test(diagnostic)) reason = 'QUOTA_OR_BUDGET';
    else reason = 'PROVIDER_ERROR';
  }
  else if (!output.trim()) { status = 'FAIL'; reason = 'NO_OUTPUT'; }
  else if (!skillRead && options.requireSkill !== false) { status = 'FAIL'; reason = 'SKILL_READ_NOT_OBSERVED'; }
  let response = null;
  if (status === 'REVIEW_REQUIRED' && options.output !== 'text') {
    try { response = parseResponse(output); }
    catch { status = 'FAIL'; reason = 'OUTPUT_CONTRACT_FAILED'; }
  }
  // Only the final response and aggregate counts are saved. Init events, raw
  // provider streams, commands, account identifiers and environment are not.
  return { status, reason, output, response, usage, skillRead, actions, readCount: reads.length,
    processExitCode: result.code, providerCompleted, durationMs: result.durationMs };
}

export function sanitize(text, fixtureRoot) {
  return text.replaceAll(fixtureRoot, '<fixture>')
    .replace(/(?:sk-|sk-ant-)[A-Za-z0-9_-]{12,}/g, '[redacted]')
    .replace(/\b(?:Bearer|token|api[_-]?key|password)\s*[:=]\s*[^\s,}]+/gi, '[redacted]')
    .replace(/\/Users\/[^/\s]+/g, '<user-home>');
}
