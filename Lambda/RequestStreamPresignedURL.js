import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'ap-southeast-2' });
const s3BucketName = process.env.BUCKET_NAME;
if (!s3BucketName) {
  throw new Error("Missing environment variable: BUCKET_NAME");
}

export const handler = async (event) => {
  try {
    let videoKey = event.pathParameters?.videoKey;
    videoKey = decodeURIComponent(videoKey);
    console.log("video key is", videoKey);
    videoKey = `processed/${videoKey}`;

    if (!videoKey) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*", 
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type" 
        },
        body: JSON.stringify({ message: "Missing video key" })
      }
    }

    const command = new GetObjectCommand ({
      Bucket: s3BucketName,
      Key: videoKey
    });

    const presignedURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const response = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ presignedURL })
    };

    return response;

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode:500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ message: "Error generating presigned URL" })
    }
  }
  
};
