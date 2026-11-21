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
    await band.unmount()
  }
})
