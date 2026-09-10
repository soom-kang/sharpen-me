import { executionEvidence } from './eval-execution.mjs';
import { observe, parseEvents } from './eval-observation.mjs';
export function modelEvidence(provider, events, requestedModel) {
  const primary = new Set(), usageModels = new Set(), evidence = [];
  let usageByModel = {};
  for (const event of events) {
    let model, source;
    if (provider === 'claude' && event.type === 'assistant' && !event.parent_tool_use_id) {
      model = event.message?.model; source = 'assistant.message.model';
    } else if (provider === 'codex' && event.type === 'item.completed' && event.item?.type === 'agent_message') {
      model = event.item.model; source = 'item.completed.agent_message.model';
    }
    if (typeof model === 'string' && model.trim()) { primary.add(model); evidence.push({source, model}); }
    if (event.type === 'result' && event.modelUsage && typeof event.modelUsage === 'object' && !Array.isArray(event.modelUsage)) {
      // Usage is aggregate accounting, never evidence of a main-answer fallback.
      for (const [name, usage] of Object.entries(event.modelUsage)) {
        usageModels.add(name);
        usageByModel[name] = Object.fromEntries(Object.entries(usage ?? {}).filter(([,value]) => typeof value === 'number' && Number.isFinite(value)));
      }
    }
  }
  const matches = name => name === requestedModel || (name.startsWith(`${requestedModel}-`) && /^[0-9]{8}$/.test(name.slice(requestedModel.length + 1)));
  return { modelPolicy: 'primary_response_only', requestedModel, primaryResponseModels: [...primary],
    usageModels: [...usageModels], usageByModel, modelEvidenceSources: evidence,
    modelEvidence: primary.size ? 'provider_reported' : 'explicit_cli_argument_only',
    primaryModelMismatch: [...primary].some(name => !matches(name)) };
}
export function observeV3(provider, result, testCase, sources, model, fixtureRoot = '<fixture>') {
  const observation = observe(provider, result, testCase.skill, sources[testCase.skill], { output: testCase.output, requireSkill: false });
  const loaded = [];
  const events = parseEvents(result.stdout);
  observation.executionEvidence = executionEvidence(provider, events, fixtureRoot);
  for (const [name, contents] of Object.entries(sources)) {
    const direct = observe(provider, result, name, contents, { output: 'text', requireSkill: false });
    // Claude's native Skill tool may return the full source instead of issuing Read.
    const pending = new Set();
    let native = false;
    for (const event of events) {
      for (const block of event.message?.content ?? []) {
        if (event.type === 'assistant' && block.type === 'tool_use' && block.name === 'Skill' && block.input?.skill === name) pending.add(block.id);
        if (event.type === 'user' && block.type === 'tool_result' && pending.has(block.tool_use_id) && !block.is_error) {
          const text = typeof block.content === 'string' ? block.content : (block.content ?? []).map(b => b.text ?? '').join('\n');
          if (text.includes(contents.trim())) native = true;
        }
      }
    }
    if (direct.skillRead || native) loaded.push(name);
  }
  if (observation.reason === 'PROVIDER_ERROR' && /(?:model[^\n]*(?:not.found|not.available|not.supported|does.not.exist|invalid)|unknown.model|invalid.model)/i.test(result.stderr + result.stdout)) { observation.reason = 'MODEL_MISMATCH'; }
  const expected = testCase.invocation === 'implicit' ? testCase.expectedSkills : [testCase.skill];
  const selection = expected.length === 0
    ? loaded.length ? 'FAIL' : observation.providerCompleted ? 'PASS' : 'NOT_RUN'
    : expected.every(name => loaded.includes(name)) && loaded.every(name => expected.includes(name)) ? 'PASS'
      : loaded.some(name => !expected.includes(name)) ? 'FAIL' : 'UNCLEAR';
  observation.loadedSkills = loaded;
  observation.selection = testCase.invocation === 'implicit' ? selection : null;
  observation.skillRead = loaded.includes(testCase.skill);
  Object.assign(observation, modelEvidence(provider, events, model));
  if (observation.primaryModelMismatch) {
    observation.status = 'NOT_RUN'; observation.reason = 'MODEL_MISMATCH';
  } else if (observation.status === 'REVIEW_REQUIRED' && selection !== 'PASS') {
    observation.status = selection === 'FAIL' ? 'FAIL' : 'UNCLEAR'; observation.reason = 'SKILL_LOADING_EVIDENCE';
  }
  // Only relevant source-loading events are retained; no full init/environment stream.
  observation.loadingEvidence = loaded.map(name => ({ skill: name, fullSourceObserved: true }));
  return observation;
}
export function providerCommand(provider, testCase, cwd, config) {
  const settings = config.providers[provider];
  if (provider === 'codex') return ['codex', 'exec', '--ephemeral', '--ignore-user-config', '--skip-git-repo-check',
    '--sandbox', testCase.mutablePaths.length ? 'workspace-write' : 'read-only', '--json', '--cd', cwd,
    '--model', settings.model, '-c', `model_reasoning_effort=${JSON.stringify(settings.effort)}`,
    '-c', 'features.multi_agent=false', '-c', 'web_search="disabled"', '-'];
  const tools = ['Skill', 'Read', 'Glob', 'Grep', ...(testCase.mutablePaths.length ? ['Edit', 'Write'] : [])].join(',');
  return ['claude', '-p', '--no-session-persistence', '--output-format', 'stream-json', '--verbose',
    '--model', settings.model, '--effort', settings.effort, '--permission-mode', 'dontAsk',
    '--tools', tools, '--allowedTools', tools, '--setting-sources', 'project', '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}', '--settings', '{"disableAllHooks":true}'];
}
export function taskPrompt(provider, testCase) {
  const explicit = testCase.invocation === 'explicit' ? `Explicit invocation: ${provider === 'codex' ? '$' : '/'}${testCase.skill}. Read .${provider === 'codex' ? 'agents' : 'claude'}/skills/${testCase.skill}/SKILL.md and use its procedure.\n` : '';
  return `${explicit}Work only in this fixture. Do not read other projects, personal configuration, credentials, global skills or memory. No network, nested agents or model CLIs are available. The host permits writes only to ${JSON.stringify(testCase.mutablePaths)}. All other files, including supplied tests and instructions, are read-only. The host runs behavior checks separately. Do not claim unexecuted checks. Honor the caller's requested output format.\n\n${testCase.prompt}`;
}
