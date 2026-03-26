/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { UsersRepository, UserProfilesRepository } from '@/models/_.js';
import type { MiUserProfile } from '@/models/UserProfile.js';
import type { MiUser } from '@/models/User.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { SignupService } from '@/core/SignupService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { bindThis } from '@/decorators.js';
import type { Redis } from 'ioredis';

type EvexAccountUserInfo = {
	sub: string;
	name?: string;
	picture?: string;
	updated_at?: string;
	email?: string;
	email_verified?: boolean;
	discord_id?: string | null;
	discord_roles?: Array<{
		id: string;
		name: string;
		color: number;
		position: number;
	}> | null;
};

type PendingState = {
	codeVerifier: string;
	createdAt: number;
};

type EvexAccountCompleteResult = {
	id: string;
	token: string;
	username: string;
};

@Injectable()
export class EvexAccountService {
	private readonly issuer: string;
	private readonly authorizationEndpoint: string;
	private readonly tokenEndpoint: string;
	private readonly userInfoEndpoint: string;
	private readonly clientId: string | undefined;
	private readonly clientSecret: string | undefined;
	private readonly redirectUri: string;
	private readonly statePrefix = 'evex-account:state:';

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.redis)
		private redis: Redis,

		private httpRequestService: HttpRequestService,
		private signupService: SignupService,
		private userEntityService: UserEntityService,
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,
		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,
	) {
		this.issuer = 'https://account.evex.land';
		this.authorizationEndpoint = process.env.EVEXACCOUNT_AUTHORIZATION_ENDPOINT ?? new URL('/api/oauth/authorize', this.issuer).toString();
		this.tokenEndpoint = process.env.EVEXACCOUNT_TOKEN_ENDPOINT ?? new URL('/api/oauth/token', this.issuer).toString();
		this.userInfoEndpoint = process.env.EVEXACCOUNT_USERINFO_ENDPOINT ?? new URL('/api/oauth/userinfo', this.issuer).toString();
		this.clientId = process.env.EVEXACCOUNT_CLIENT_ID;
		this.clientSecret = process.env.EVEXACCOUNT_CLIENT_SECRET;
		this.redirectUri = new URL('/callback', this.config.url).toString();
	}

	@bindThis
	public async createAuthorizationUrl() {
		if (!this.clientId) {
			throw new Error('EVEXACCOUNT_CLIENT_ID is not configured');
		}

		const state = secureRndstr(64);
		const codeVerifier = secureRndstr(96);
		const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

		const stateData: PendingState = {
			codeVerifier,
			createdAt: Date.now(),
		};

		await this.redis.set(
			`${this.statePrefix}${state}`,
			JSON.stringify(stateData),
			'EX',
			60 * 10,
		);

		const authorizeUrl = new URL(this.authorizationEndpoint);
		authorizeUrl.searchParams.set('response_type', 'code');
		authorizeUrl.searchParams.set('client_id', this.clientId);
		authorizeUrl.searchParams.set('redirect_uri', this.redirectUri);
		authorizeUrl.searchParams.set('scope', 'openid profile email offline_access discord_id');
		authorizeUrl.searchParams.set('state', state);
		authorizeUrl.searchParams.set('code_challenge', codeChallenge);
		authorizeUrl.searchParams.set('code_challenge_method', 'S256');

		return {
			state,
			authorizeUrl: authorizeUrl.toString(),
		};
	}

	@bindThis
	public async completeAuthorization(code: string, state: string): Promise<EvexAccountCompleteResult> {
		if (!this.clientId) {
			throw new Error('EVEXACCOUNT_CLIENT_ID is not configured');
		}

		const rawState = await this.redis.get(`${this.statePrefix}${state}`);
		if (!rawState) {
			throw new Error('Invalid or expired EvexAccount state');
		}

		await this.redis.del(`${this.statePrefix}${state}`);

		const pendingState = JSON.parse(rawState) as PendingState;
		if (!pendingState.codeVerifier || typeof pendingState.codeVerifier !== 'string') {
			throw new Error('Invalid EvexAccount state payload');
		}

		const tokenBody = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: this.redirectUri,
			client_id: this.clientId,
			code_verifier: pendingState.codeVerifier,
		});

		if (this.clientSecret) {
			tokenBody.set('client_secret', this.clientSecret);
		}

		const tokenResponse = await this.httpRequestService.send(this.tokenEndpoint, {
			method: 'POST',
			body: tokenBody.toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			timeout: 10_000,
		}, {
			throwErrorWhenResponseNotOk: true,
		});

		const tokenJson = await tokenResponse.json() as {
			access_token: string;
			token_type?: string;
			expires_in?: number;
			refresh_token?: string;
			scope?: string;
			id_token?: string;
		};

		if (!tokenJson.access_token) {
			throw new Error('EvexAccount did not return an access token');
		}

		const userInfoResponse = await this.httpRequestService.send(this.userInfoEndpoint, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${tokenJson.access_token}`,
				Accept: 'application/json',
			},
			timeout: 10_000,
		}, {
			throwErrorWhenResponseNotOk: true,
		});

		const userInfo = await userInfoResponse.json() as EvexAccountUserInfo;
		if (!userInfo.sub) {
			throw new Error('EvexAccount userinfo did not include sub');
		}

		const { account, secret } = await this.findOrCreateLocalUser(userInfo);
		const me = await this.userEntityService.pack(account, account, {
			schema: 'MeDetailed',
			includeSecrets: true,
		});

		return {
			...me,
			token: secret,
		};
	}

	private async findOrCreateLocalUser(userInfo: EvexAccountUserInfo): Promise<{ account: MiUser; secret: string; }> {
		const linkedProfile = await this.userProfilesRepository.createQueryBuilder('profile')
			.innerJoinAndSelect('profile.user', 'user')
			.where("(profile.\"clientData\" -> 'evexAccount' ->> 'sub') = :sub", { sub: userInfo.sub })
			.getOne();

		if (linkedProfile?.user) {
			const account = linkedProfile.user;
			await this.updateLinkedProfile(account.id, userInfo, linkedProfile);
			await this.usersRepository.update(account.id, {
				name: userInfo.name?.slice(0, 128) ?? account.name,
			});
			return {
				account,
				secret: account.token!,
			};
		}

		const password = secureRndstr(32);
		const usernameCandidates = this.buildUsernameCandidates(userInfo);
		let createdAccount: MiUser | null = null;
		let secret: string | null = null;

		for (const username of usernameCandidates) {
			try {
				const result = await this.signupService.signup({
					username,
					password,
				});
				createdAccount = result.account;
				secret = result.secret;
				break;
			} catch (err) {
				const message = typeof err === 'string' ? err : (err as Error).message;
				if (![
					'INVALID_USERNAME',
					'DUPLICATED_USERNAME',
					'USED_USERNAME',
					'DENIED_USERNAME',
				].some(x => message.includes(x))) {
					throw err;
				}
			}
		}

		if (createdAccount == null || secret == null) {
			throw new Error('Failed to derive a unique username from EvexAccount profile');
		}

		await this.updateLinkedProfile(createdAccount.id, userInfo);
		await this.usersRepository.update(createdAccount.id, {
			name: userInfo.name?.slice(0, 128) ?? createdAccount.name,
		});

		return {
			account: createdAccount,
			secret,
		};
	}

	private async updateLinkedProfile(accountId: string, userInfo: EvexAccountUserInfo, currentProfile?: MiUserProfile) {
		const profile = currentProfile ?? await this.userProfilesRepository.findOneByOrFail({ userId: accountId });
		const nextClientData = {
			...(profile.clientData ?? {}),
			evexAccount: {
				sub: userInfo.sub,
				email: userInfo.email ?? null,
				name: userInfo.name ?? null,
				picture: userInfo.picture ?? null,
				updatedAt: userInfo.updated_at ?? null,
			},
		};

		profile.email = userInfo.email ?? null;
		profile.emailVerified = userInfo.email_verified === true;
		profile.clientData = nextClientData;
		await this.userProfilesRepository.save(profile);
	}

	private buildUsernameCandidates(userInfo: EvexAccountUserInfo): string[] {
		const candidates = new Set<string>();
		const shortHash = createHash('sha256').update(userInfo.sub).digest('hex').slice(0, 10);

		const rawSources = [
			userInfo.email?.split('@')[0],
			userInfo.name,
			`evex_${shortHash}`,
		];

		for (const source of rawSources) {
			const normalized = this.normalizeUsername(source);
			if (normalized) {
				candidates.add(normalized);
			}
		}

		const generated = [...candidates];
		for (const base of generated) {
			for (let i = 1; i <= 9; i++) {
				candidates.add(this.truncateUsername(`${base}${i}`));
			}
		}

		return [...candidates];
	}

	private normalizeUsername(source: string | undefined): string | null {
		if (!source) return null;

		const normalized = source
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9_]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.replace(/_+/g, '_');

		if (!normalized) return null;
		return this.truncateUsername(normalized);
	}

	private truncateUsername(username: string): string {
		return username.slice(0, 20);
	}
}
