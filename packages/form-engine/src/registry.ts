import type { App, Component, InjectionKey, Plugin } from 'vue'

export type ComponentRegistry = Record<string, Component>

export const REGISTRY_KEY: InjectionKey<ComponentRegistry> = Symbol('octarine-form:registry')

const globalRegistry: ComponentRegistry = {}

export function registerComponent(type: string, component: Component): void {
  globalRegistry[type] = component
}

export function registerComponents(components: ComponentRegistry): void {
  Object.assign(globalRegistry, components)
}

export function getGlobalRegistry(): ComponentRegistry {
  return globalRegistry
}

export interface FormRendererPluginOptions {
  components?: ComponentRegistry
}

export function createFormRendererPlugin(options: FormRendererPluginOptions = {}): Plugin {
  return {
    install(app: App) {
      if (options.components) registerComponents(options.components)
      app.provide(REGISTRY_KEY, globalRegistry)
    },
  }
}
