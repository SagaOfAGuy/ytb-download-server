import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Function to grab the secret name from AWS credentials manager
export async function getSecret(secretName, region) {
    const client = new SecretsManagerClient({ region });
    try {
      const response = await client.send(
        new GetSecretValueCommand({
          SecretId: secretName,
          VersionStage: "AWSCURRENT",
        })
      );
      return response.SecretString;
    } catch (error) {
      console.error("Error retrieving secret:", error);
      throw error;
    }
}