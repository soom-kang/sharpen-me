import { executionEvidence } from './eval-execution.mjs';
import { observe, parseEvents } from './eval-observation.mjs';
const sourceObserved = (text, source) => typeof source === 'string' && source.trim() &&
  text.split('\n').map(line => line.replace(/^\s*\d+(?:→|\t|\|)/, '')).join('\n').includes(source.trim());
const resultText = value => typeof value === 'string' ? value : Array.isArray(value)
  ? value.filter(block => block.type === 'text').map(block => block.text ?? '').join('\n') : undefined;
const skillPaths = value => {
  if (typeof value !== 'string') return [];
  const paths = [...value.matchAll(/(?:^|[\s'"/=])([^/\s'";|&]+)\/SKILL\.md(?=$|[\s'";|&:])/g)];
  const skills = paths.map(match => /^[a-z0-9-]+$/.test(match[1]) ? match[1] : '<unattributed-skill>');
  if (!paths.length && /(?:^|[\s'"])SKILL\.md(?=$|[\s'";|&])/.test(value)) skills.push('<unattributed-skill>');
  return [...new Set(skills)];
};
// Exclusion globs name paths a search skips; they are not access.
const exclusions = /\s(?:-g|--glob|--iglob)(?:\s+|=)(?:(['"])!.*?\1|!\S*)|\s--exclude(?:-dir)?=(?:(['"]).*?\2|\S*)/g;
const program = part => part.match(/^(?:\s*['"])?\s*(?:\/(?:usr\/)?bin\/)?(cat|head|tail|sed|awk|grep|rg|more|less|wc|find|ls|fd)\s/)?.[1];
const commandAccess = command => {
  // Recognize ordinary CLI file readers, searches, listings and their shell
  // wrappers. Unrecognized commands mentioning a Skill path remain incomplete
  // evidence, not no-use.
  const script = (command ?? '').trim().replace(/^(?:\/(?:usr\/)?bin\/)?(?:ba|z)?sh\s+-[lc]+\s+(['"])([\s\S]*)\1$/, '$2');
  const parts = script.split(/[;|&]/).map(part => part.replace(exclusions, ' '));
  const listing = part => ['find', 'ls', 'fd'].includes(program(part)) || (program(part) === 'rg' && /\s--files(?=\s|$)/.test(part));
  const named = parts.filter(part => !listing(part)).flatMap(skillPaths);
  return {
    skills: [...new Set(named)],
    readSkills: parts.filter(part => program(part) && !listing(part)).flatMap(skillPaths),
    // A listing pattern such as `-name SKILL.md` is not a path; its output names the files.
    listedSkills: parts.filter(listing).flatMap(skillPaths).filter(skill => skill !== '<unattributed-skill>'),
    // A listing, or a search that names no Skill path, reveals the files it
    // touched only through its output, e.g. `rg --hidden pattern .`.
    outputKinds: [...new Set(parts.flatMap(part => listing(part) ? ['discovery']
      : ['grep', 'rg'].includes(program(part)) && !skillPaths(part).length ? ['content'] : []))],
  };
};

// Access and complete source loading are different evidence. Keep only the
// minimum attribution/completion facts, never source bytes or tool arguments.
export function skillAccessEvidence(provider, events, sources) {
  const evidence = [], pending = new Map();
  const add = (skill, via, completed, success, text, kind = 'content', allowFullSource = true) => evidence.push({ skill, via, kind,
    completion: !completed || (kind === 'content' && skill === '<unattributed-skill>') ? 'missing' : !success ? 'failed' : typeof text !== 'string' ? 'missing' : 'success',
    fullSourceObserved: kind === 'content' && allowFullSource && completed && success && typeof text === 'string' && Boolean(sourceObserved(text, sources[skill])) });
  for (const event of events) {
    if (provider === 'codex' && ['item.started','item.completed'].includes(event.type) && event.item?.type === 'command_execution') {
      const item = event.item, access = commandAccess(item.command), skills = access.skills;
      if (event.type === 'item.started') {
        if (skills.length && item.id) pending.set(item.id, { skills, via: 'command', access });
        else if (skills.length) for (const skill of skills) add(skill, 'command', false, false);
      } else {
        const started = pending.get(item.id);
        const hasCommand = typeof item.command === 'string' && item.command.trim();
        const accessed = hasCommand ? skills : started?.skills ?? ['<unattributed-skill>'];
        const { readSkills, listedSkills, outputKinds } = hasCommand ? access : started?.access ?? { readSkills: [], listedSkills: [], outputKinds: [] };
        const finished = Number.isInteger(item.exit_code), succeeded = item.exit_code === 0;
        for (const skill of accessed) add(skill, 'command', readSkills.includes(skill) && finished, succeeded, item.aggregated_output);
        const listed = outputKinds.includes('discovery') ? skillPaths(item.aggregated_output) : [];
        for (const skill of new Set([...listedSkills, ...listed])) add(skill, 'command', finished, succeeded, item.aggregated_output, 'discovery');
        if (outputKinds.includes('content')) for (const skill of skillPaths(item.aggregated_output)) {
          if (!accessed.includes(skill)) add(skill, 'command', finished, succeeded, item.aggregated_output, 'content', false);
        }
        pending.delete(item.id);
      }
    }
    if (provider === 'claude' && event.type === 'assistant') {
      for (const block of event.message?.content ?? []) {
        if (block.type !== 'tool_use') continue;
        let skills = [];
        if (block.name === 'Read') skills = typeof block.input?.file_path === 'string' ? skillPaths(block.input.file_path) : ['<unattributed-skill>'];
        else if (block.name === 'Skill') skills = [/^[a-z0-9-]+$/.test(block.input?.skill ?? '') ? block.input.skill : '<unattributed-skill>'];
        else if (['Grep','Glob'].includes(block.name)) {
          skills = skillPaths(block.input?.path ?? block.input?.glob ?? block.input?.pattern);
          const inputs = [block.input?.path, block.input?.glob, block.input?.pattern].filter(value => typeof value === 'string');
          if (!skills.length && inputs.some(value => /(?:^|\/)\.(?:agents|claude)\/skills(?:\/|$)|SKILL\.md/.test(value))) skills = ['<unattributed-skill>'];
        }
        if (!skills.length && !['Grep','Glob'].includes(block.name)) continue;
        const kind = block.name === 'Glob' ? 'discovery' : 'content';
        const allowFullSource = block.name !== 'Grep' || block.input?.output_mode === 'content';
        if (block.id) pending.set(block.id, { skills, via: block.name, kind, allowFullSource });
        else for (const skill of skills) add(skill, block.name, false, false, undefined, kind, allowFullSource);
      }
    }
    if (provider === 'claude' && event.type === 'user') {
      for (const block of event.message?.content ?? []) {
        const access = block.type === 'tool_result' && pending.get(block.tool_use_id);
        if (!access) continue;
        const text = resultText(block.content);
        const resultSkills = ['Grep','Glob'].includes(access.via) ? skillPaths(text) : [];
        const skills = resultSkills.length && (!access.skills.length || access.skills.every(skill => skill === '<unattributed-skill>'))
          ? resultSkills : access.skills.length ? access.skills
            : block.is_error || typeof text !== 'string' ? ['<unattributed-skill>'] : [];
        for (const skill of skills) add(skill, access.via, true, !block.is_error, text, access.kind, access.allowFullSource);
        pending.delete(block.tool_use_id);
      }
    }
  }
  for (const { skills, via, kind, allowFullSource } of pending.values()) {
    for (const skill of skills.length ? skills : ['<unattributed-skill>']) add(skill, via, false, false, undefined, kind, allowFullSource);
  }
  return evidence;
}

export function skillSelection(evidence, expected, providerCompleted) {
  if (!Array.isArray(evidence) || evidence.some(e => !e || typeof e.skill !== 'string' ||
      !['Read','Skill','Grep','Glob','command'].includes(e.via) || !['success','failed','missing'].includes(e.completion) ||
      (e.kind !== undefined && !['content','discovery'].includes(e.kind)) ||
      typeof e.fullSourceObserved !== 'boolean' || (e.fullSourceObserved && e.completion !== 'success'))) return 'UNCLEAR';
  if (evidence.some(e => e.completion === 'success' && (e.kind !== 'discovery' || !expected.length) && !expected.includes(e.skill))) return 'FAIL';
  if (evidence.some(e => e.completion !== 'success')) return 'UNCLEAR';
  if (!providerCompleted) return 'NOT_RUN';
  return expected.every(skill => evidence.some(e => e.kind !== 'discovery' && e.skill === skill && e.fullSourceObserved)) ? 'PASS' : 'UNCLEAR';
}
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
  const events = parseEvents(result.stdout);
  observation.executionEvidence = executionEvidence(provider, events, fixtureRoot);
  observation.skillAccessEvidence = skillAccessEvidence(provider, events, sources);
  const loaded = [...new Set(observation.skillAccessEvidence.filter(e => e.fullSourceObserved).map(e => e.skill))];
  if (observation.reason === 'PROVIDER_ERROR' && /(?:model[^\n]*(?:not.found|not.available|not.supported|does.not.exist|invalid)|unknown.model|invalid.model)/i.test(result.stderr + result.stdout)) { observation.reason = 'MODEL_MISMATCH'; }
  const expected = testCase.invocation === 'implicit' ? testCase.expectedSkills : [testCase.skill];
  const selection = skillSelection(observation.skillAccessEvidence, expected, observation.providerCompleted);
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
