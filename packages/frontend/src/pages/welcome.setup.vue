<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithAnimBg>
	<div :class="$style.formContainer">
		<div :class="$style.form" class="_panel">
			<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="z-index:1;position:relative" viewBox="0 0 854 300">
				<defs>
					<linearGradient id="linear" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#86b300"/><stop offset="100%" stop-color="#4ab300"/>
					</linearGradient>
				</defs>

				<g transform="translate(427, 150) scale(1, 1) translate(-427, -150)">
					<path d="" fill="url(#linear)" opacity="0.4">
						<animate
							attributeName="d"
							dur="20s"
							repeatCount="indefinite"
							keyTimes="0;0.333;0.667;1"
							calcmod="spline"
							keySplines="0.2 0 0.2 1;0.2 0 0.2 1;0.2 0 0.2 1"
							begin="0s"
							values="M0 0L 0 220Q 213.5 260 427 230T 854 255L 854 0 Z;M0 0L 0 245Q 213.5 260 427 240T 854 230L 854 0 Z;M0 0L 0 265Q 213.5 235 427 265T 854 230L 854 0 Z;M0 0L 0 220Q 213.5 260 427 230T 854 255L 854 0 Z"
						>
						</animate>
					</path>
					<path d="" fill="url(#linear)" opacity="0.4">
						<animate
							attributeName="d"
							dur="20s"
							repeatCount="indefinite"
							keyTimes="0;0.333;0.667;1"
							calcmod="spline"
							keySplines="0.2 0 0.2 1;0.2 0 0.2 1;0.2 0 0.2 1"
							begin="-10s"
							values="M0 0L 0 235Q 213.5 280 427 250T 854 260L 854 0 Z;M0 0L 0 250Q 213.5 220 427 220T 854 240L 854 0 Z;M0 0L 0 245Q 213.5 225 427 250T 854 265L 854 0 Z;M0 0L 0 235Q 213.5 280 427 250T 854 260L 854 0 Z"
						>
						</animate>
					</path>
				</g>
			</svg>
			<div :class="$style.title">
				<div>Eveskeyへようこそ!</div>
				<div :class="$style.version">v{{ version }}</div>
			</div>
			<div style="padding: 16px 32px 32px 32px;">
				<form v-if="!accountCreated" class="_gaps_m" @submit.prevent="createAccount()">
					<div style="text-align: center;" class="_gaps_s">
						<div><b>{{ i18n.ts._serverSetupWizard.installCompleted }}</b></div>
						<div>{{ i18n.ts.evexAccount.welcomeCreateIntro }}</div>
					</div>
					<MkButton gradate large rounded :disabled="accountCreating" data-cy-admin-ok style="margin: 0 auto;" type="submit">
						{{ accountCreating ? i18n.ts.processing : i18n.ts.evexAccount.welcomeCreateButton }}<MkEllipsis v-if="accountCreating"/>
					</MkButton>
				</form>
				<div v-else-if="step === 0" class="_gaps_m">
					<div style="text-align: center;" class="_gaps_s">
						<div><b>{{ i18n.ts._serverSetupWizard.accountCreated }}</b></div>
					</div>
					<MkButton gradate large rounded data-cy-next style="margin: 0 auto;" @click="step++">
						{{ i18n.ts.next }}
					</MkButton>
				</div>
				<div v-else-if="step === 1" class="_gaps_m">
					<div style="text-align: center;" class="_gaps_s">
						<div style="font-size: 120%;"><b>{{ i18n.ts._serverSetupWizard.serverSetting }}</b></div>
						<div>{{ i18n.ts._serverSetupWizard.youCanEasilyConfigureOptimalServerSettingsWithThisWizard }}</div>
						<div>{{ i18n.ts._serverSetupWizard.settingsYouMakeHereCanBeChangedLater }}</div>
					</div>

					<Suspense>
						<template #default>
							<MkServerSetupWizard :token="token!" @finished="onWizardFinished"/>
						</template>
						<template #fallback>
							<MkLoading/>
						</template>
					</Suspense>

					<MkButton rounded style="margin: 0 auto;" @click="skipSettings">
						{{ i18n.ts._serverSetupWizard.skipSettings }}
					</MkButton>
				</div>
				<div v-else-if="step === 2" class="_gaps_m">
					<div style="text-align: center;" class="_gaps_s">
						<div><b>{{ i18n.ts._serverSetupWizard.settingsCompleted }}</b></div>
						<div>{{ i18n.ts._serverSetupWizard.settingsCompleted_description }}</div>
						<div>{{ i18n.ts._serverSetupWizard.settingsCompleted_description2 }}</div>
					</div>
					<div class="_gaps_s" :class="$style.donation">
						<div><b>{{ i18n.ts._serverSetupWizard.donationRequest }}</b></div>
						<div>{{ i18n.ts._serverSetupWizard._donationRequest.text1 }}<br>{{ i18n.ts._serverSetupWizard._donationRequest.text2 }}<br>{{ i18n.ts._serverSetupWizard._donationRequest.text3 }}</div>
						<MkLink target="_blank" url="https://misskey-hub.net/docs/donate/" style="margin: 0 auto;">{{ i18n.ts.learnMore }}</MkLink>
					</div>
					<div class="_buttonsCenter">
						<MkButton gradate large rounded data-cy-next style="margin: 0 auto;" @click="finish">
							{{ i18n.ts.start }}
						</MkButton>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageWithAnimBg>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { version } from '@@/js/config.js';
import MkButton from '@/components/MkButton.vue';
import MkEllipsis from '@/components/global/MkEllipsis.vue';
import MkLink from '@/components/MkLink.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkServerSetupWizard from '@/components/MkServerSetupWizard.vue';
import PageWithAnimBg from '@/components/global/PageWithAnimBg.vue';
import { i18n } from '@/i18n.js';
import { getAccountWithSignupDialog, login } from '@/accounts.js';

const accountCreating = ref(false);
const accountCreated = ref(false);
const step = ref(0);
let token: string | null = null;

async function createAccount() {
	if (accountCreating.value) return;
	accountCreating.value = true;

	try {
		const res = await getAccountWithSignupDialog();
		if (!res) return;

		token = res.token;
		accountCreated.value = true;
	} finally {
		accountCreating.value = false;
	}
}

function onWizardFinished() {
	step.value++;
}

function skipSettings() {
	step.value++;
}

function finish() {
	if (token == null) return;
	login(token);
}
</script>

<style lang="scss" module>
.formContainer {
	min-height: 100svh;
	padding: 32px 32px 64px 32px;
	box-sizing: border-box;
	align-content: center;
}

.form {
	position: relative;
	z-index: 10;
	border-radius: var(--MI-radius);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
	overflow: clip;
	max-width: 550px;
	margin: 0 auto;
}

.title {
	position: absolute;
	top: 16px;
	left: 0;
	right: 0;
	z-index: 1;
	margin: 0;
	font-size: 1.5em;
	text-align: center;
	padding: 32px;
	color: #fff;
	font-weight: bold;
}

.version {
	font-size: 70%;
	font-weight: normal;
	opacity: 0.7;
}

.donation {
	background: var(--MI_THEME-accentedBg);
	border-radius: 12px;
	padding: 16px;
	text-align: center;
}
</style>
