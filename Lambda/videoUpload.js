/**This Lambda function is designed to generate a presigned URL to be sent back to the client
 * to upload a video
*/

// Setting up S3 connection
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: "ap-southeast-2" });

// Main function
export const handler = async (event) => {
  const { displayName } = JSON.parse(event.body);

  // Validate input
  if (!displayName) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid input: displayName is required" }),
    };
  }

  const dateTime = Date.now();

  const bucketName = "videostreamingvideos";

  function generateRandomString(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  const randomString = generateRandomString();

  const videoKey = `uploads/${randomString}/${dateTime}`;

  try {
    // Generate presigned URL
    const s3Params = {
      Bucket: bucketName,
      Key: videoKey
    };

    const command = new PutObjectCommand(s3Params);
    const presignedURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Return success response
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: presignedURL,
        key: videoKey,
        timeUploaded: dateTime,
        message: "Success",
      }),
    };
  } catch (err) {
    console.error("Error generating presigned URL:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not process request",
        details: err.message,
      }),
    };
  }
};