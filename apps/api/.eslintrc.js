module.exports = {
  extends: ['../../packages/config/eslint'],
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
  rules: {
    'import/no-unresolved': ['error', { ignore: ['^hono/'] }],
  },
};