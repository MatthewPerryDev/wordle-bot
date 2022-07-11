export const WORDLE = {
  name: "wordle",
  type: 1,
  description: "Submit your solution",
  options: [
    {
      type: 3,
      name: "solution",
      description: "You wordle solution.",
      required: true,
    }
  ],
};

export const LEADERBOARD = {
  name: "leaderboard",
  type: 1,
  description: "Prints leaderboard for the server",
  options: [
    {
      type: 5,
      name: "weekly",
      description: "Dislplay the leaderboard only concerning this weeks scores.",
    },
  ],
};


export const  STATS = {
  name: "stats",
  type: 1,
  description: "Prints out the user's statistics",
  options: []
}