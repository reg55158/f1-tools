import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	OPENF1_BASE: {
		schema: (value) => (value ? value.replace(/\/+$/, '') : 'https://api.openf1.org/v1'),
		description:
			'OpenF1 API base URL. Leave empty for the public API; point it at a mock to test offline.'
	}
});
