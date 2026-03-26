<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.card" class="_gaps_m">
		<div :class="$style.header" class="_gaps_s">
			<div :class="$style.icon">
				<i class="ti ti-login-2"></i>
			</div>
			<div :class="$style.title">{{ i18n.ts.evexAccount.title }}</div>
			<div v-if="message" :class="$style.message">{{ message }}</div>
		</div>
		<div :class="$style.body" class="_gaps_m">
			<MkButton gradate rounded large :disabled="waiting" @click="onEvexAccountLogin">
				<template v-if="waiting">
					<MkLoading :em="true" :colored="false"/>
				</template>
				<template v-else>{{ i18n.ts.evexAccount.signIn }}</template>
			</MkButton>
			<div :class="$style.caption">
				{{ i18n.ts.evexAccount.signInDescription }}
			</div>
		</div>
	</div>
</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import { i18n } from '@/i18n.js';
import { login } from '@/accounts.js';
import { startEvexAccountFlow } from '@/utility/evex-account.js';
import * as os from '@/os.js';

const emit = defineEmits<{
	(ev: 'login', v: Misskey.entities.SigninFlowResponse & { finished: true }): void;
}>();

const props = withDefaults(defineProps<{
	autoSet?: boolean;
	message?: string;
	openOnRemote?: unknown;
	initialUsername?: string;
}>(), {
	autoSet: false,
	message: '',
	openOnRemote: undefined,
	initialUsername: undefined,
});

const waiting = ref(false);

async function onEvexAccountLogin() {
	waiting.value = true;

	try {
		const res = await startEvexAccountFlow();
		if (!res) return;

		const flow = {
			finished: true,
			id: res.id,
			i: res.token,
		} satisfies Misskey.entities.SigninFlowResponse & { finished: true };

		emit('login', flow);

		if (props.autoSet) {
			await login(res.token);
		}
	} catch (err) {
		console.error(err);
		os.alert({
			type: 'error',
			title: i18n.ts.loginFailed,
			text: err instanceof Error ? err.message : JSON.stringify(err),
		});
	} finally {
		waiting.value = false;
	}
}
</script>

<style lang="scss" module>
.root {
	position: relative;
}

.card {
	display: grid;
	gap: 24px;
	padding: 24px;
}

.header {
	text-align: center;
	display: grid;
	gap: 12px;
}

.icon {
	width: 56px;
	height: 56px;
	margin: 0 auto;
	border-radius: 50%;
	display: grid;
	place-items: center;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
	font-size: 24px;
}

.title {
	font-size: 1.2em;
	font-weight: 700;
}

.message,
.caption {
	opacity: 0.8;
	text-align: center;
}

.body {
	display: grid;
	gap: 12px;
}
</style>
