import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({});
const clientId = process.env.COGNITO_CLIENT_ID; // Stored in env file, will be moved to secretsManager
console.log(clientId);

export const handler = async (event) => {

  const { email, confirmationCode } = JSON.parse(event.body);

  if (!email || !confirmationCode) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: true,
        message: "Email and confirmation code are required",
      }),
    };
  }

  try {
    const command = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
    });
    const response = await cognitoClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: false,
        message: "Account has been confirmed",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        message: error.message,
      }),
    };
  }

};
