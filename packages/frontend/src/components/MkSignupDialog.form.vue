<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<div :class="$style.banner">
		<i class="ti ti-user-plus"></i>
	</div>
	<div class="_spacer" style="--MI_SPACER-min: 20px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<div :class="$style.text">
				{{ i18n.ts._signup.almostThere }}
			</div>
			<div :class="$style.text">
				{{ i18n.ts.evexAccount.signupDescription }}
			</div>
			<MkButton type="button" gradate large rounded :disabled="submitting" style="margin: 0 auto;" @click="onSubmit">
				<template v-if="submitting">
					<MkLoading :em="true" :colored="false"/>
				</template>
				<template v-else>{{ i18n.ts.evexAccount.goToSignup }}</template>
			</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkButton from './MkButton.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import { i18n } from '@/i18n.js';
import { login } from '@/accounts.js';
import { startEvexAccountFlow } from '@/utility/evex-account.js';
import * as os from '@/os.js';

const props = withDefaults(defineProps<{
	autoSet?: boolean;
}>(), {
	autoSet: false,
});

const emit = defineEmits<{
	(ev: 'signup', user: any): void;
	(ev: 'signupEmailPending'): void;
}>();

const submitting = ref(false);

async function onSubmit(): Promise<void> {
	if (submitting.value) return;
	submitting.value = true;

	try {
		const res = await startEvexAccountFlow();
		if (!res) return;

		emit('signup', res);

		if (props.autoSet) {
			await login(res.token);
		}
	} catch (err) {
		console.error(err);
		os.alert({
			type: 'error',
			title: i18n.ts.somethingHappened,
			text: err instanceof Error ? err.message : JSON.stringify(err),
		});
	} finally {
		submitting.value = false;
	}
}
</script>

<style lang="scss" module>
.banner {
	padding: 16px;
	text-align: center;
	font-size: 26px;
	background-color: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}

.text {
	text-align: center;
}
</style>
