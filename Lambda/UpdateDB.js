import mysql from "mysql2/promise";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const RDS_SECRET_NAME = "videoRDSCredentials";
const client = new SecretsManagerClient({ region: "ap-southeast-2" });

let pool;
let cachedCredentials = null;

async function getDatabaseCredentials() {
  if (cachedCredentials) return cachedCredentials;

  console.log(`[${new Date().toISOString()}] Fetching database credentials...`);
  const command = new GetSecretValueCommand({ SecretId: RDS_SECRET_NAME });

  try {
    const secretValue = await client.send(command);
    cachedCredentials = JSON.parse(secretValue.SecretString);
    console.log(`[${new Date().toISOString()}] Database credentials retrieved. Retrieved: ${secretValue.SecretString}`);
    return cachedCredentials;
  } catch (error) {
    console.error("Error retrieving database credentials:", error);
    throw new Error("Failed to retrieve database credentials");
  }
}

async function connectToDatabase() {
  if (!pool) {
    console.log(`[${new Date().toISOString()}] Creating MySQL connection pool...`);
    pool = mysql.createPool({
      host: "placeholderHost",
      user: "placeholderUser",
      password: "placeholderPassword",
      database: "placeholderDatabase",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

export const handler = async (event) => {
  try {
    console.log(`[${new Date().toISOString()}] Lambda function triggered.`);

    if (!event.body) {
      console.error("Request body is missing:", event);
      return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing" }) };
    }

    console.log(`[${new Date().toISOString()}] Parsing request body...`);
    const { videoKey, displayName, email, uploadTime } = JSON.parse(event.body);

    if (!videoKey || !displayName || !email || !uploadTime) {
      console.error("Invalid input:", event);
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid input data" }) };
    }

    console.log("Input data", uploadTime, videoKey, displayName, email);


    const formattedUploadTime = new Date(Number(uploadTime)).toISOString();
    const formattedKey = videoKey.split("uploads/")[1];

    console.log(formattedUploadTime);

    console.log(`[${new Date().toISOString()}] Connecting to database...`);
    const pool = await connectToDatabase();
    const connection = await pool.getConnection();

    try {
      console.log(`[${new Date().toISOString()}] Executing SQL query...`);
      const query = `
          INSERT INTO VideoMetadata (videoKey, displayName, email, uploadTime)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          displayName = VALUES(displayName),
          email = VALUES(email), 
          uploadTime = VALUES(uploadTime);
      `;

      await connection.execute(query, [formattedKey, displayName, email, formattedUploadTime]);

      console.log(`[${new Date().toISOString()}] Metadata successfully updated in RDS.`);
    } finally {
      connection.release();
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Success" }) };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error updating database:`, err);
    return { statusCode: 500, body: JSON.stringify({ error: "Database update failed", details: err.message }) };
  }
};
