import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

// Use envrionment variables
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.URL
const region = process.env.REGION

const sqsClient = new SQSClient({ region: region });

export const handler = async (event) => {
    console.log('Received S3 event:', JSON.stringify(event, null, 2));

    try {
        for (const record of event.Records) {
            const bucketName = record.s3.bucket.name;
            const objectKey = record.s3.object.key;

            console.log(`New video uploaded: ${objectKey} in bucket ${bucketName}`);

            // Prepare message payload
            const messageBody = JSON.stringify({
                bucket: bucketName,
                key: objectKey,
            });

            const params = {
                QueueUrl: SQS_QUEUE_URL,
                MessageBody: messageBody,
                MessageGroupId: "VideoUploads", 
                MessageDeduplicationId: objectKey
            };

            // Send message to SQS
            const response = await sqsClient.send(new SendMessageCommand(params));
            console.log(`Message sent to SQS. MessageId: ${response.MessageId}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "S3 event processed successfully" })
        };
    } catch (error) {
        console.error('Error processing event:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error processing S3 event" })
        };
    }
};
