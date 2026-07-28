import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Nano-Banana MCP',
  description: 'An MCP server for AI image generation and editing using Google Gemini',
  base: '/Nano-Banana-MCP/',
  // Design docs live under docs/ but must never ship as public pages.
  srcExclude: ['**/superpowers/**'],
  themeConfig: {
    nav: [
      { text: 'Configuration', link: '/configuration' },
      { text: 'Tools', link: '/tools' },
      { text: 'Workflows', link: '/workflows' },
      { text: 'Changelog', link: '/changelog' },
    ],
    sidebar: [
      {
        text: 'Getting started',
        items: [{ text: 'Configuration', link: '/configuration' }],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Tools', link: '/tools' },
          { text: 'Example workflows', link: '/workflows' },
        ],
      },
      {
        text: 'Project',
        items: [{ text: 'Changelog', link: '/changelog' }],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/fjacquet/Nano-Banana-MCP' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@fjacquet/nano-banana-mcp' },
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/fjacquet/Nano-Banana-MCP/edit/main/docs/:path',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Fork of ConechoAI/Nano-Banana-MCP',
    },
  },
});
