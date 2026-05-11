import adapter from '@sveltejs/adapter-auto'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    env: {
      dir: '../../'
    },
    adapter: adapter(),
    alias: {
      $lib: 'src/lib',
    },
  },
}

export default config