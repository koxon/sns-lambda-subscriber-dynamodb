import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Process a Stripe Event
export async function processEvent(event) {
	const supportedEvents = [
    'payment_intent.succeeded',
    'customer.created',
    'customer.updated',
    'charge.succeeded',
    'customer.subscription.created',
    'customer.subscription.updated',
    'invoice.payment_failed',
    'invoice.paid',
    'checkout.session.completed',
    'checkout.session.expired'
  ];

  // The event will not be stored and will be deleted from SQS
  if (!supportedEvents.includes(event.type))
    throw `⚠️ Unsupported Stripe event: ${event.type}`;

  try {
    if (event.type == 'checkout.session.completed') {
      console.log("Checkout session completed");

      // First we check if the customer exists in our DB. We try to GET the user from DynamoDB
      const client_reference_id = event.data.object.client_reference_id;
      const email = event.data.object.customer_details;

      // Get the user if we find him
      const data = await docClient.send(new GetCommand({
          TableName: process.env.USERS_TABLE_NAME,
          IndexName: process.env.USERS_TABLE_NAME + 'ByAddress',
          Key: {
            "address": client_reference_id
          }
        }));

      // Bad user object?
      if (!data || !data.Item)
        throw `Invalid User. Unable to process Event.`
      
      const user = data.Item;
      console.log("User found", user);

      // Add attributes to the user
      const command = await docClient.send(new UpdateCommand({
        TableName: process.env.USERS_TABLE_NAME,
        Key: {
          'userId': user.userId
        },
        UpdateExpression: 'SET email = :emailVal, customer_details = :customerDetailsVal, customer = :customerStripeIdVal, subscription = :subscriptionVal',
        ExpressionAttributeValues: {
          ':emailVal': email,
          ':customerDetailsVal': marshall(event.data.object.customer_details),
          ':subscriptionVal': event.data.object.subscription,
          ':customerStripeIdVal': event.data.object.customer
        }
      }));
    }
  } catch (e) {
    console.log(e);
    return false;
  }

  return true;
}

export default processEvent;
