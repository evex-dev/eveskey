<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithAnimBg>
	<div :class="$style.root">
		<div v-if="phase === 'loading'" :class="$style.card" class="_gaps_s">
			<MkLoading/>
			<div>{{ i18n.ts.processing }}</div>
		</div>
		<div v-else-if="phase === 'success'" :class="$style.card" class="_gaps_s">
			<div :class="$style.icon"><i class="ti ti-check"></i></div>
			<div :class="$style.title">{{ i18n.ts.evexAccount.title }}</div>
			<div>{{ i18n.ts._auth.accepted }}</div>
		</div>
		<div v-else :class="$style.card" class="_gaps_s">
			<div :class="$style.icon"><i class="ti ti-alert-triangle"></i></div>
			<div :class="$style.title">{{ i18n.ts.somethingHappened }}</div>
			<div>{{ errorMessage }}</div>
		</div>
	</div>
</PageWithAnimBg>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { apiUrl } from '@@/js/config.js';
import MkLoading from '@/components/global/MkLoading.vue';
import PageWithAnimBg from '@/components/global/PageWithAnimBg.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { login } from '@/accounts.js';
import { postEvexAccountResult } from '@/utility/evex-account.js';

const phase = ref<'loading' | 'success' | 'error'>('loading');
const errorMessage = ref('');

function readQuery(name: string): string | null {
	return new URL(window.location.href).searchParams.get(name);
}

onMounted(async () => {
	const error = readQuery('error');
	if (error) {
		errorMessage.value = error;
		phase.value = 'error';
		postEvexAccountResult(null, error);
		if (window.opener && !window.opener.closed) {
			window.close();
		}
		return;
	}

	const code = readQuery('code');
	const state = readQuery('state');

	if (!code || !state) {
		errorMessage.value = 'Missing code or state';
		phase.value = 'error';
		postEvexAccountResult(null, errorMessage.value);
		if (window.opener && !window.opener.closed) {
			window.close();
		}
		return;
	}

	try {
		const res = await window.fetch(`${apiUrl}/evex-account/complete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				code,
				state,
			}),
			credentials: 'omit',
			cache: 'no-cache',
		});

		const body = await res.json();
		if (!res.ok) {
			throw new Error(body?.error?.message ?? i18n.ts.evexAccount.errorComplete);
		}

		postEvexAccountResult(body);
		phase.value = 'success';

		if (window.opener && !window.opener.closed) {
			window.close();
		} else {
			await login(body.token, '/');
		}
	} catch (err) {
		errorMessage.value = err instanceof Error ? err.message : String(err);
		phase.value = 'error';
		postEvexAccountResult(null, errorMessage.value);
		if (window.opener && !window.opener.closed) {
			window.close();
		}
	}
});

definePage(() => ({
	title: i18n.ts.evexAccount.title,
	icon: 'ti ti-login-2',
}));
</script>

<style lang="scss" module>
.root {
	min-height: 100svh;
	display: grid;
	place-items: center;
	padding: 32px;
	box-sizing: border-box;
}

.card {
	width: min(440px, calc(100vw - 64px));
	padding: 32px;
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
	box-shadow: 0 12px 32px rgb(0 0 0 / 25%);
	text-align: center;
}

.icon {
	width: 56px;
	height: 56px;
	margin: 0 auto;
	border-radius: 50%;
	display: grid;
	place-items: center;
	font-size: 24px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}

.title {
	font-size: 1.2em;
	font-weight: 700;
}
</style>
