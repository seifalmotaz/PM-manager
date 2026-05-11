import { swagger } from '@elysiajs/swagger'

export const openApiPlugin = swagger({
  path: '/docs',
  documentation: {
    info: {
      title: 'Saha API',
      version: '0.1.0',
      description: 'Project management tool for workers across multiple work identities',
    },
  },
})
