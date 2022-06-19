export const WORDLE = {
  name: "wordle",
  description: "Submit your solution",
  options: [
    {
      type: 3,
      name: "solution",
      description: "",
      required: true,
    },
  ],
};

export const LEADERBOARD = {
  name: "leaderboard",
  description: "Prints leaderboard for the server",
  options: [
    {
      type: 5,
      name: "weekly",
      description: "",
    },
  ],
};


export const  STATS = {
  "name": "stats",
  "description": "Prints out the user's statistics",
  "options": []
}