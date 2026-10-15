import { describe, expect, it, vi } from 'vitest'

import { ListService } from './ListService'

describe('ListService', () => {
  it('returns a form-local list without touching the provider', async () => {
    const getList = vi.fn()
    const service = new ListService({ statuses: [{ id: 1 }, { id: 2 }] }, { getList })

    expect(await service.getList('statuses')).toEqual([{ id: 1 }, { id: 2 }])
    expect(getList).not.toHaveBeenCalled()
  })

  it("falls back to the provider when the name isn't a form-local list", async () => {
    const service = new ListService({}, { getList: (name) => [{ name, source: 'provider' }] })

    expect(await service.getList('countries')).toEqual([{ name: 'countries', source: 'provider' }])
  })

  it('awaits an async provider', async () => {
    const service = new ListService(
      {},
      {
        getList: async (name) => Promise.resolve([{ name }]),
      },
    )

    expect(await service.getList('remoteList')).toEqual([{ name: 'remoteList' }])
  })

  it('returns an empty array when there is no form-local list and no provider given', async () => {
    const service = new ListService()
    expect(await service.getList('anything')).toEqual([])
  })
})
