import { Router } from "itty-router";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { STATS, LEADERBOARD, WORDLE } from "./commands.js";
import { Wordle } from "./Wordle.js"
//import { REST } from "@discordjs/rest";
//import { Routes } from "discord-api-types/v10";
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
	let userID = message.member.user.id;
	console.log(userID);
	if (!Wordle.isValidWordleExpression(submission)) {

		return new JsonResponse({ type: 4, data: { content: "Invalid Input" } });
	}

	let captures = Wordle.parseDateAndScore(submission);
	let date = parseInt(captures[1]);
	let attempt = captures[2];


	let result = await env.BOT_DB.prepare('SELECT * FROM Users WHERE UserID = ?').bind(userID).first();
	//Existing User
	if (result != null) {
		result = await env.BOT_DB.prepare('SELECT * FROM Submissions WHERE WordleDay = ? AND UserID = ?').bind(date,userID).all();
		if (result.results.length > 0) {
			return new JsonResponse({ type: 4, data: { content: "You have already made your submission for this day." } });
		}
		await env.BOT_DB.prepare('INSERT INTO Submissions (UserID, Attempts, WordleDay) VALUES (?, ?, ?)').bind(userID,attempt,date).run();
		return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
	}
	//New user
	await env.BOT_DB.prepare('INSERT INTO Users (UserID, Score) VALUES (?, ?)').bind(userID,(6 - attempt) + 1).run();
	await env.BOT_DB.prepare('INSERT INTO Submissions (UserID, Attempts, WordleDay) VALUES (?, ?, ?)').bind(userID,attempt,date).run();
	return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
}

async function stats(message, env) {
	let body = await env.BOT_DB.prepare('SELECT * FROM Users WHERE UserID = ?').bind(message.member.user.id).first();
	if (body == null) {
		return new JsonResponse({ type: 4, data: { content: "You have not submitted any solutions." } });
	}
	return new JsonResponse({ type: 4, data: { content: `You have a score of ${body.Score}.` } });
}

async function leaderboard(message, env) {
	console.log(message);
	let {results} = await env.BOT_DB.prepare('SELECT * FROM Users ORDER BY Score DESC').all();
	let content = "";
	let counter = 0;
	for (const user of results) {
		content+=	`${counter+1}. <@${user['UserID']}>\n`	
		counter++;
		if (counter>24) {
			break;
		}
	}
	if (results.findIndex(item => item['UserID'] === message.member.id)> 24) {
		content+= `${results.findIndex(item => item['UserID'] === message.member.id)+1}. <@${message.member.id}>`
	}

	return new JsonResponse({ type: 4, data: { content: content } });


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