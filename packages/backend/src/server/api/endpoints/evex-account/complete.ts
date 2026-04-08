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
	properties: {
		code: { type: 'string' },
		state: { type: 'string' },
	},
	required: ['code', 'state'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private evexAccountService: EvexAccountService,
	) {
		super(meta, paramDef, async (ps) => {
			return await this.evexAccountService.completeAuthorization(ps.code, ps.state);
		});
	}
}
