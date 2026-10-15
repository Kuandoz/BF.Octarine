import type { StorybookConfig } from '@storybook/vue3-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.ts',
    '../../../packages/vue/src/**/*.stories.ts',
  ],
  addons: [
    {
      // GitHub-flavored Markdown, for tables in MDX pages.
      name: '@storybook/addon-docs',
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/vue3-vite',
  staticDirs: [{ from: '../../../assets/brand', to: '/brand' }],
}

export default config
