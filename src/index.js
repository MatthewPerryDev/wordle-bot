/**
 * The core server that runs on a Cloudflare worker.
 */

import { Router } from "itty-router";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { STATS, LEADERBOARD, WORDLE } from "./commands.js";
import { Wordle } from "./Wordle.js"
// this is fine
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
	if (!Wordle.isValidWordleExpression(submission)) {

		return new JsonResponse({ type: 4, data: { content: "Invalid Input" } });
	}

	let body = await env.BOT_DB.get(message.member.user['id']);
	console.log(body);

	let captures = Wordle.parseDateAndScore(submission);

	let date = parseInt(captures[1]);
	let attempt = captures[2];

	if (body != null) {
		body = JSON.parse(body);
		if (body.dates.includes(date)) {
			return new JsonResponse({ type: 4, data: { content: "You have already made your submission for this day." } });
		}
		await env.BOT_DB.put(message.member.user['id'], Wordle.storeMetricsForExistingUser(body, attempt, date));
		return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
	}

	await env.BOT_DB.put(message.member.user['id'], Wordle.storeMetricsForNewUser(attempt, date));
	return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
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

			default:
				break;
		}
		return new JsonResponse({ error: "Unknown Type" }, { status: 400 });
	}

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
