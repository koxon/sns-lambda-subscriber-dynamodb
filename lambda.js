import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { marshall } from "@aws-sdk/util-dynamodb";
import parseSqsSnsMessage from './src/parse-sqs-sns-event.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const saveToDynamoDB = async (data) => {
  if (!data) return;

  try {
    if (!data.id) throw 'No Stripe event id';
    
    // TTL to expire the stripe event in Dynamo after 3 months
    data.ttl = Math.floor((Date.now() + (3 * 30 * 24 * 60 * 60 * 1000)) / 1000);

    // Data to insert in Dynamo
    const params = {
      TableName: process.env.STRIPE_EVENTS_TABLE_NAME,
      Item: data
    };

    console.log("Save to Dynamo", data);
    return await docClient.send(new PutCommand(params));
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const handler = async (event) => {
  console.log("Event", JSON.stringify(event));

  // We parse the event and get a list of messages to process.
  // Each message contains a Stripe event
  let messages = await parseSqsSnsMessage(event);

  // Saving all messages in Dynamo
  return await Promise.all(messages.map(async message => {
      return saveToDynamoDB(message);
    })
  );
};

