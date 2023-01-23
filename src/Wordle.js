
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



}

export { Wordle };