import astroPlugin from 'eslint-plugin-astro';

export default [
  {
    ignores: ['dist/', 'node_modules/'],
  },
  ...astroPlugin.configs['flat/recommended'],
];
