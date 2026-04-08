/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';
import { apiUrl } from '@@/js/config.js';
import { i18n } from '@/i18n.js';

const MESSAGE_TYPE = 'misskey:evex-account:complete';

export type EvexAccountResponse = Misskey.entities.MeDetailed & { token: string };

type StartResponse = {
	authorizeUrl: string;
	state: string;
};

type WindowMessage = {
	type: string;
	result?: EvexAccountResponse;
	error?: {
		message: string;
	};
};

export async function startEvexAccountFlow(): Promise<EvexAccountResponse | null> {
	const startRes = await window.fetch(`${apiUrl}/evex-account/start`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: '{}',
		credentials: 'omit',
		cache: 'no-cache',
	});

	if (!startRes.ok) {
		const body = await startRes.json().catch(() => null);
		throw new Error(body?.error?.message ?? i18n.ts.evexAccount.errorStart);
	}

	const { authorizeUrl } = await startRes.json() as StartResponse;
	const popup = window.open(authorizeUrl, '_blank', 'popup=yes,width=560,height=760');

	if (!popup) {
		window.location.href = authorizeUrl;
		return await new Promise<EvexAccountResponse | null>(() => {});
	}

	return await new Promise<EvexAccountResponse | null>((resolve, reject) => {
		const cleanup = () => {
			window.removeEventListener('message', onMessage);
			window.clearInterval(closeWatcher);
		};

		const closeWatcher = window.setInterval(() => {
			if (popup.closed) {
				cleanup();
				resolve(null);
			}
		}, 500);

		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;
			const data = event.data as WindowMessage | undefined;
			if (data == null || data.type !== MESSAGE_TYPE) return;

			cleanup();

			if (data.error) {
				reject(new Error(data.error.message));
				return;
			}

			resolve(data.result ?? null);
		};

		window.addEventListener('message', onMessage);
	});
}

export function postEvexAccountResult(result: EvexAccountResponse | null, error?: string) {
	const payload: WindowMessage = {
		type: MESSAGE_TYPE,
		result: result ?? undefined,
		error: error ? { message: error } : undefined,
	};

	if (window.opener && !window.opener.closed) {
		window.opener.postMessage(payload, window.location.origin);
	}
}
