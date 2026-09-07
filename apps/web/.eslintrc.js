module.exports = {
  extends: ['next/core-web-vitals', '../../packages/config/eslint'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/no-unescaped-entities': 'off',
    'import/order': 'off',
    'import/no-duplicates': 'off',
    'import/no-unresolved': 'off',
    'react-hooks/exhaustive-deps': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'import/no-named-as-default': 'off',
    '@next/next/no-img-element': 'off',
  },
};