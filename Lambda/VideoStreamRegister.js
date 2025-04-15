// Logic to handle register data from user

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({});
const clientId = process.env.COGNITO_CLIENT_ID; // Stored in env file, will be moved to secretsManager
console.log(clientId);

export const handler = async (event) => {

  const { email, password, firstName, lastName, username } = JSON.parse(event.body); // Parse the event body for request data

  if (!email || !password || !firstName || !lastName || !username) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: true,
        message: "Email, password, first name, last name and username are all required."
      }),
    };
  }

  // logic to send sign in data to cognito
  // required attributes from cognito uesr pool are:
  // email, given_name, family_name, preferred_username
  try {
    const command = new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "given_name", Value: firstName },      
        { Name: "family_name", Value: lastName },      
        { Name: "preferred_username", Value: username },
      ],
    });

    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "User registered",
        response,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message,
      }),
    };
  }
};