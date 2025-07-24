/** @type {import('prettier').Config} */
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: ['*.md', '*.mdx'],
      options: {
        printWidth: 100,
        proseWrap: 'preserve',
      },
    },
    {
      files: ['*.json'],
      options: {
        tabWidth: 2,
        trailingComma: 'none',
      },
    },
  ],
}