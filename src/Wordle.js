
class Wordle {

	static validInputParsingRegex = /^\s*Wordle\s*([0-9]+)\s*(\d|X)\/\d\s*((?:[🟩⬛🟨]{5}\s*){1,6})$/u;

	static isValidWordleExpression(submission) {
		return this.validInputParsingRegex.test(submission);
	}

	static parseDateAndAttempts(submission) {
		let parsedData = this.validInputParsingRegex.exec(submission);
		let date = parsedData[1];
		let attempts = parsedData[2] == 'X' ? 7 : parseInt(parsedData[2]);
		return {date, attempts};
	}

}

export { Wordle };