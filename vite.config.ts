import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import CompatMatrixReporter from './scripts/compat-matrix-reporter.mjs';

const generated = [
	'.svelte-kit/**',
	'build/**',
	'worker-configuration.d.ts',
	// Written by the font-src/ scripts — regenerate, never hand-format.
	'fonts.lock.json',
	'src/lib/styles/fonts.css',
	'static/fonts/**',
	'font-src/upstream/**',
	// Written by scripts/compat-matrix-reporter.mjs and
	// scripts/browser-versions.mjs on every `pnpm test` — see /compat.
	'src/lib/fonts/compat-matrix.generated.json',
	'src/lib/fonts/browser-versions.generated.json'
];

// The SvelteKit plugin installs a dev-server hook that is incompatible with the
// Vitest environment. Unit tests cover pure modules plus `import.meta.glob`
// content loading, none of which need SvelteKit.
const inTest = !!process.env.VITEST;

export default defineConfig({
	plugins: inTest
		? []
		: [
				sveltekit({
					// SvelteKit 3 takes these options flat — not under a `kit` key.
					prerender: {
						// Prerendering follows every internal link, so a strict handler
						// turns the build into a link checker. Add a path here only when
						// something outside this app serves it.
						handleHttpError: ({ path, referrer, message }) => {
							const external: string[] = [];
							if (external.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))
								return;
							throw new Error(`${message} (linked from ${referrer})`);
						}
					},
					compilerOptions: {
						// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
						runes: ({ filename }) =>
							filename.split(/[/\\]/).includes('node_modules') ? undefined : true
					},
					adapter: adapter()
				})
			],

	// Oxfmt — `vp fmt` / `vp check`. Formats .ts/.js/.svelte/.css/.json.
	fmt: {
		useTabs: true,
		singleQuote: true,
		semi: true,
		printWidth: 100,
		trailingComma: 'none',
		svelte: { indentScriptAndStyle: true },
		sortPackageJson: true,
		ignorePatterns: [...generated, 'pnpm-lock.yaml', 'CHANGELOG.md']
	},

	// Oxlint — `vp lint` / `vp check`. Lints .ts/.js only; `.svelte` type + a11y
	// diagnostics come from `pnpm check:svelte`.
	lint: {
		plugins: ['typescript', 'unicorn', 'import'],
		categories: { correctness: 'error' },
		options: { typeAware: true, typeCheck: true },
		ignorePatterns: generated
	},

	// Vitest — `vp test`.
	test: {
		expect: { requireAssertions: true },
		// Collects src/lib/fonts/slant.browser.test.ts's tagMatrix() calls into
		// src/lib/fonts/compat-matrix.generated.json — see the reporter's own
		// header comment and /compat.
		reporters: ['default', new CompatMatrixReporter()],
		projects: [
			{
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.browser.{test,spec}.{js,ts}']
				}
			},
			{
				// Real engines, because the font questions this project cares about
				// (does an oblique @font-face range work? does the engine synthesise a
				// skew on top of a real axis?) cannot be answered in jsdom.
				// Caveat: Playwright's WebKit is NOT Safari. It catches regressions;
				// it does not settle "does old Safari do this". See docs/compat.md.
				publicDir: 'static',
				test: {
					name: 'browser',
					include: ['src/**/*.browser.{test,spec}.{js,ts}'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }]
					}
				}
			}
		]
	}
});
