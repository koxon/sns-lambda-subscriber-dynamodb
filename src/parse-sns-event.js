
export function parseSnsMessage(event) {
	if (!event || !event.Records || !Array.isArray(event.Records)) {
		return [];
	}
  
	console.log("Record", event.Records);

	let extractMessage = record => record.Sns && {
		message: record.Sns.Message,
		subject: record.Sns.Subject,
		messageAttributes: record.Sns.MessageAttributes
	};

  console.log("extractMessage", record);

	return event.Records.map(extractMessage).filter(message => message);
}

export default parseSnsMessage;
