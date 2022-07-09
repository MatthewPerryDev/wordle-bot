
class Wordle {

	static validInputParsingRegex = /^\s*Wordle\s*([0-9]+)\s*(\d|X)\/\d\s*((?:[🟩⬛🟨]{5}\s*){1,6})$/u;

	static isValidWordleExpression(submission) {
		return this.validInputParsingRegex.test(submission);
	}

	static parseDateAndScore(submission) {
		return this.validInputParsingRegex.exec(submission);
	}

	static isFailedAttemptFor(currentAttempt) {
		return currentAttempt == 'X';
	}

	static storeMetricsForNewUser(attempt, date) {
		if (this.isFailedAttemptFor(attempt)) {
			return JSON.stringify({
				score: 0,
				dates: [date],
				stats: [0, 0, 0, 0, 0, 0, 1]
			});
		}

		let score = parseInt(attempt);
		let statsarray = [0, 0, 0, 0, 0, 0, 0];
		statsarray[score - 1] = 1;
		return JSON.stringify({
			score: (6 - score) + 1,
			dates: [date],
			stats: statsarray
		});
	}
	static storeMetricsForExistingUser(body, attempt, date) {

		body.dates.push(date);

		if (this.isFailedAttemptFor(attempt)) {
			body.stats[6] += 1;
			return JSON.stringify(body);
		}

		body.score += (6 - parseInt(attempt)) + 1;
		body.stats[parseInt(attempt) - 1] += 1;
		return JSON.stringify(body);

	}
}

export { Wordle };