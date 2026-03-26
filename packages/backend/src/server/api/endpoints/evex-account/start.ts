/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { EvexAccountService } from '@/server/EvexAccountService.js';

export const meta = {
	tags: ['auth'],
	requireCredential: false,
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private evexAccountService: EvexAccountService,
	) {
		super(meta, paramDef, async () => {
			return await this.evexAccountService.createAuthorizationUrl();
		});
	}
}
