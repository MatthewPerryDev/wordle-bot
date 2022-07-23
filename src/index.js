/**
 * The core server that runs on a Cloudflare worker.
 */

import { Router } from "itty-router";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { STATS, LEADERBOARD, WORDLE } from "./commands.js";
import { Wordle } from "./Wordle.js"

class JsonResponse extends Response {
	constructor(body, init) {
		const jsonBody = JSON.stringify(body);
		init = init || {
			headers: {
				"content-type": "application/json;charset=UTF-8",
			},
		};
		super(jsonBody, init);
	}
}

async function wordle(message, env) {
	let submission = message.data.options[0]['value'];
	let guildId = message.data.guild_id;
	let userId = message.member.user.id;
	if (!Wordle.isValidWordleExpression(submission)) {

		return new JsonResponse({ type: 4, data: { content: "Invalid Input" } });
	}

	let body = await env.BOT_DB.get(guildId);
	body = JSON.parse(body);
	let captures = Wordle.parseDateAndScore(submission);
	let date = parseInt(captures[1]);
	let attempt = captures[2];

	if (body == null) {
		let data = {}
		data[userId] = Wordle.storeMetricsForNewUser(attempt, date);

		await env.BOT_DB.put(guildId, JSON.stringify(data));
		return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
	}

	//Exisitng guild
	//old user
	if (userId in body) {
		let userData = JSON.parse(body[userId]);
		if (userData.dates.includes(date)) {
			return new JsonResponse({ type: 4, data: { content: "You have already made your submission for this day." } });
		}
		body[userId] = Wordle.storeMetricsForExistingUser(userData, attempt, date)
		await env.BOT_DB.put(guildId, JSON.stringify(body));
		return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
	}
	//New user
	body[userId] = Wordle.storeMetricsForNewUser(attempt, date);
	await env.BOT_DB.put(guildId, JSON.stringify(body));
	return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
}

async function stats(message, env) {
	let body = await env.BOT_DB.get(message.member.user.id);
	body = JSON.parse(body);
	if (body == null) {
		return new JsonResponse({ type: 4, data: { content: "You have not submitted any solutions." } });
	}
	return new JsonResponse({ type: 4, data: { content: `You have a score of ${body.score}.` } });
}

async function leaderboard(message, env) {
	console.log('Not ready');
}

const router = Router();

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post("/", async (request, env) => {
	const message = await request.json();
	if (message.type === InteractionType.PING) {
		return new JsonResponse({
			type: InteractionResponseType.PONG,
		});
	}

	if (message.type === InteractionType.APPLICATION_COMMAND) {
		switch (message.data.name.toLowerCase()) {
			case WORDLE.name.toLowerCase():
				return wordle(message, env);
			case STATS.name.toLocaleLowerCase():
				return stats(message, env);
			case LEADERBOARD.name.toLocaleLowerCase():
				return leaderboard(message, env);
			default:
				break;
		}
		return new JsonResponse({ error: "Unknown Type" }, { status: 400 });
	}
	//Addd route for when bot is added to a new guild
	return new JsonResponse({ error: "Unknown Type" }, { status: 400 });
});
router.all("*", () => new Response("Not Found.", { status: 404 }));

export default {
	/**
	 * Every request to a worker will start in the `fetch` method.
	 * Verify the signature with the request, and dispatch to the router.
	 * @param {*} request A Fetch Request object
	 * @param {*} env A map of key/value pairs with env vars and secrets from the cloudflare env.
	 * @returns
	 */
	async fetch(request, env) {
		if (request.method === "POST") {
			// Using the incoming headers, verify this request actually came from discord.
			const signature = request.headers.get("x-signature-ed25519");
			const timestamp = request.headers.get("x-signature-timestamp");
			const body = await request.clone().arrayBuffer();
			const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
			if (!isValidRequest) {
				return new Response("Bad request signature.", { status: 401 });
			}
		}
		// Dispatch the request to the appropriate route
		return router.handle(request, env);
	},
};