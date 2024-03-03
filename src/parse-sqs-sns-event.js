import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import processEvent from './process-event.js';

export async function parseSqsSnsMessage(event) {
	if (!event || !event.Records || !Array.isArray(event.Records)) {
		return [];
	}

  const sqs = new SQSClient({});
  
	console.log("Record", event.Records);

  // Mapping function to extract the Stripe event from the SNS and SQS encapsulation
	let extractBody = async record => {
    try {
      if (!record.body)
        throw new Error("No body found");
      
      let body = JSON.parse(record.body);
      let message = JSON.parse(body.Message);

      console.log("Message", message);

      // If the processing is a success we delete the msg
      if (await processEvent(message)){
        // Delete msg from queue
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: process.env.QUEUE_URL,
          ReceiptHandle: record.receiptHandle
        }));

        // We return the message to be inserted in the event table
        return message;
      }

      // We failed to process the event. We keep the message in the DLQ. We don't register in the event table.
      return null;
    } catch (e) {
      console.error(e);
      
      // Delete msg from queue as it's a bad message
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        ReceiptHandle: record.receiptHandle  
      }));

      // The message was bad or the event type not supported. We don't include this message in the event table
      return null;
    }
  }

  // Returning only the clean message
  let messages = await Promise.all(
    event.Records.map(async record => {
      // We go over all the Lambda records and extract the Stripe event from the SNS and SQS encapsulation.
      return extractBody(record);
    })
  );
  messages = messages.filter(m => m);

  console.log("Messages", messages);

	return messages;
}

export default parseSqsSnsMessage;
