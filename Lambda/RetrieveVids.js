import mysql from "mysql2/promise";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// Use envrionment variables
import dotenv from 'dotenv';
dotenv.config();

const host = process.env.HOST;
const user = process.env.USER;
const password = process.env.PASSWORD;
const database = process.env.DATABASE;

const RDS_SECRET_NAME = "videoRDSCredentials";
const client = new SecretsManagerClient({ region: "ap-southeast-2" });

// Create connection pool 
let pool;
let cachedCredentials = null; // see if credentials to get video credentials have already been retrieved by Lambda

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
    // Use hardcoded values since secrets manager doesnt want to work for some unknown reason
  if (!pool) {
    console.log(`[${new Date().toISOString()}] Creating MySQL connection pool...`);
    pool = mysql.createPool({
      host: host,
      user: user,
      password: password,
      database: database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

export const handler = async (event) => {
  let connection;

    try {
      console.log(`[${new Date().toISOString()}] Retrieving all transcoded videos...`);
      const pool = await connectToDatabase();
      connection = await pool.getConnection();

      const query = "SELECT videoKey, displayName, uploadTime FROM VideoMetadata WHERE isTranscoded = 1";
      const [rows] = await connection.execute(query);

      if (rows.length === 0) {
        console.warn(`[${new Date().toISOString()}] Warning: No videos found. There may be an internal database issue`);
        return { statusCode: 404, body: JSON.stringify({ message: `No videos found. There may be an internal issue` }) };
      }

      console.log(`[${new Date().toISOString()}] Successfully retrieved ${rows.length} transcoded videos.`);

      return { statusCode: 200, body: JSON.stringify({ videos: rows }) };

    } catch (dbError) {
      console.error(`[${new Date().toISOString()}] Database retrieval error:`, dbError);
      return { statusCode: 500, body: JSON.stringify({ message: "Failed to retrieve videos", error: dbError.message }) };
    } finally {
      if (connection) connection.release();
    }
}
