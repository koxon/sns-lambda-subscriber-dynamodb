import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocument.from(client);

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
      const email = (event.data.object.customer_details.email ? event.data.object.customer_details.email : "");

      console.log("Finding user", client_reference_id);
      console.log("User email", email);
      // Get the user if we find him
      const data = await docClient.get({
        TableName: process.env.USERS_TABLE_NAME,
        Key: {
          'userId': client_reference_id
        }
      });

      // Bad user object?
      if (!data || !data.Item)
        throw `Invalid User. Unable to process Event.`
      
      const user = data.Item;
      console.log("User found", user);

      // Add attributes to the user
      const result = await docClient.update({
        TableName: process.env.USERS_TABLE_NAME,
        Key: {
          'userId': user.userId
        },
        UpdateExpression: 'SET email = :emailVal, customer_details = :customerDetailsVal, customer = :customerStripeIdVal, subscription = :subscriptionVal',
        ExpressionAttributeValues: {
          ':emailVal': email,
          ':customerDetailsVal': event.data.object.customer_details,
          ':subscriptionVal': event.data.object.subscription,
          ':customerStripeIdVal': event.data.object.customer
        }
      });

      console.log("User updated", result);      
    }
  } catch (e) {
    console.log(e);
    return false;
  }

  return true;
}

export default processEvent;
