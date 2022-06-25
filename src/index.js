/**
 * The core server that runs on a Cloudflare worker.
 */

import { Router } from "itty-router";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { STATS, LEADERBOARD, WORDLE } from "./commands.js";

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

async function wordle(message) {
  let reg = RegExp('^\s*Wordle\s*([0-9]+)\s*(\d)\/\d\s*((?:[🟩⬛🟨]{5}\s*){1,6})$','u');
  console.log(message)
  if (reg.test(message.data.message)) {
    return new JsonResponse({ type: 4, data: { content: "Valid Input" } });
  } else {
    return new JsonResponse({ type: 4, data: { content: "Invalid Input" } });
  }
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
        return wordle(message);

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
