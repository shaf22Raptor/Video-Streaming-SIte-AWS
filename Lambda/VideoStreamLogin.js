import { CognitoIdentityProviderClient, InitiateAuthCommand, AuthFlowType} from "@aws-sdk/client-cognito-identity-provider";

export const handler = async (event) => {
  const cognitoClient = new CognitoIdentityProviderClient({});
  const clientId = process.env.COGNITO_CLIENT_ID; // Stored in env file, will be moved to secretsManager
  console.log(clientId);  
  
  const { email, password } = JSON.parse(event.body);

  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: true,
        message: "Email and password are required",
      }),
    };
  }

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
      ClientId: clientId,
    });

    const response = await cognitoClient.send(command);
    const { IdToken, AccessToken, RefreshToken } = response.AuthenticationResult;

    // Return the tokens (ID token, Access token, and Refresh token) to the client

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Login successful",
        idToken: IdToken, 
        accessToken: AccessToken, 
        refreshToken: RefreshToken
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        message: error.message
      })
    }
  }

};
