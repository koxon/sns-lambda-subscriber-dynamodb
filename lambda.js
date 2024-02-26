import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { uuid } from 'uuidv4';
import parseSnsMessage from './src/parse-sns-event.js';


// STRIPE_EVENTS_TABLE_NAME: !Ref StripeEventsTable
// USERS_TABLE_NAME: !Ref UsersTableName
// PINS_TABLE_TABLE_NAME: !Ref PinsTableName
// METRICS_TABLE_NAME: !Ref MetricsTableName

// const { v4: uuidv4 } = require('uuid');
// const parseSnsMessage = require('./src/parse-sns-event');

console.log("GOGO");

const dynamoDbClient = new DynamoDBClient(); 

const saveToDynamoDB = async (data) => {
  if (!data) return;
  data.id = uuid();
  console.log(data);

  const params = {
    TableName: process.env.STRIPE_EVENTS_TABLE_NAME,
    Item: data
  };

  try {
    return await dynamoDbClient.send(new PutItemCommand(params));
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const handler = async (event) => {
  console.log(JSON.stringify(event));

  let messages = parseSnsMessage(event);
  return Promise.all(messages.map(saveToDynamoDB));
};

