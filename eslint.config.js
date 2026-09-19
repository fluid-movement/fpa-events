import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		// RichContent is the single controlled component for rendering sanitized HTML.
		files: ['src/lib/components/RichContent.svelte'],
		rules: { 'svelte/no-at-html-tags': 'off' }
	},
	{
		// shadcn UI primitives and the shared layout components accept hrefs that
		// callers (or route config such as sidebarMenu.ts) have already resolved —
		// resolve() is overloaded per route and can't be applied to a Pathname union
		// at render time. Passing it through is the caller's responsibility.
		files: [
			'src/lib/components/ui/**/*.svelte',
			'src/lib/components/layout/**/*.svelte',
			// Both render hrefs their callers already resolved.
			'src/lib/components/AppSidebar.svelte',
			// `*` stands in for the [id] segment — square brackets are a character
			// class in a glob, so the literal route-param path would never match.
			'src/routes/events/*/admin/SetupChecklist.svelte',
			// Resolves the path itself and appends a division query string; the rule
			// only recognises a bare resolve() call as the whole attribute.
			'src/lib/components/rankings/RankingBreakdown.svelte'
		],
		rules: { 'svelte/no-navigation-without-resolve': 'off' }
	}
);
