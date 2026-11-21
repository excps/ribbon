import { expect, mock, test } from 'claude-code/testing'
import { fmtModel } from '../hooks/register'

test('model ids read as family and version', async () => {
  expect(fmtModel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(fmtModel('claude-opus-5-5[1m]')).toBe('Opus 5.5 · 1M')
  expect(fmtModel('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5')
  expect(fmtModel('claude-haiku-5')).toBe('Haiku 5')
  expect(fmtModel(null)).toBe(null)
})

test('the band shows the current model', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2098-12-31T22:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }] },
  }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({
      plugin: 'ribbon', surface, component: 'AbovePrompt',
      props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} },
    })
    expect(await band.find({ text: 'Opus 5.5' })).toBeDefined()
    expect(await band.find({ text: 'high' })).toBeUndefined()
    await band.unmount()
  }
})

test('the band shows the effort of the last request next to the model', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2098-12-31T22:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }] },
  }))
  on('turn.step', async function* ($, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null } as never
  })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const step = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'xhigh', messageCount: 1 } as never) as unknown as AsyncIterable<unknown>
  for await (const _ of step) void _
  const band = await $.ui.mount({
    plugin: 'ribbon', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} },
  })
  expect(await band.find({ text: 'xhigh' })).toBeDefined()
  await band.unmount()
})

test('the band shows how full the context window is', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2098-12-31T22:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 50000, window: 200000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }] },
  }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const band = await $.ui.mount({
    plugin: 'ribbon', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} },
  })
  expect(await band.find({ text: '25%' })).toBeDefined()
  expect(await band.find({ text: ' · 50k/200k' })).toBeDefined()
  // the context fill is the last thing on the line, after the usage windows
  const all = JSON.stringify(await band.find({ type: 'Box' }))
  expect(all.indexOf('5H')).toBeLessThan(all.indexOf('CTX'))
  await band.unmount()
})
