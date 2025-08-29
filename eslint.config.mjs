// @ts-check
import eslint from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import securityPlugin from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';
const { configs: securityConfigs } = securityPlugin;

export default tseslint.config(
	{
		ignores: [
			'eslint.config.mjs',
			'node_modules',
			'**/node_modules/**',
			'**/*.js',
			'**/*.d.ts',
		],
	},
	// ESLint Configs
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,

	// ESLint Plugins
	// Prettier plugin
	eslintPluginPrettierRecommended,

	// JSdoc plugin
	jsdoc.configs['flat/recommended'],

	// Security plugin
	securityConfigs.recommended,

	// Sonar plugin
	sonarjs.configs.recommended,

	// Globals
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
			},
			ecmaVersion: 5,
			sourceType: 'module',
			parserOptions: {
				project: ['tsconfig.json', 'tsconfig.spec.json'],
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		plugins: {},
		rules: {
			// TypeScript Rules
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',

			// JSdoc Rules
			'jsdoc/require-jsdoc': 'off',

			// EOL, Linebreak, and Indentation Rules
			'eol-last': ['error', 'always'],
			'linebreak-style': ['error', 'unix'],
			'no-trailing-spaces': 'error',
			indent: ['error', 'tab', { SwitchCase: 1 }],

			// Trailing Comma Rules - Allow trailing commas to match Prettier
			'comma-dangle': ['error', 'always-multiline'],

			// Prettier and Indentation Rules
			'prettier/prettier': [
				'error',
				{
					arrowParens: 'always',
					endOfLine: 'lf',
					semi: true,
					singleQuote: true,
					tabWidth: 4,
					trailingComma: 'all',
					useTabs: true,
				},
			],

			// Security Rules
			'security/detect-object-injection': 'warn',

			// Sonar Rules
			'sonarjs/no-duplicate-string': 'warn',
		},
	},
);
