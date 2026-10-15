import { defaultListProvider, type ListProvider } from './services'

export class ListService {
  private lists: Record<string, unknown[]>
  private listProvider: ListProvider

  constructor(
    lists: Record<string, unknown[]> = {},
    listProvider: ListProvider = defaultListProvider,
  ) {
    this.lists = lists
    this.listProvider = listProvider
  }

  // Form-local lists (embedded directly in the form JSON) take priority;
  // a name not found there falls through to the injected provider, which
  // may fetch it from wherever the host app's lists actually live.
  async getList(name: string): Promise<unknown[]> {
    const localList = this.lists[name]
    if (localList) return localList

    return await this.listProvider.getList(name)
  }
}
