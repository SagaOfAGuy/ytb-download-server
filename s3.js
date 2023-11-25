const { S3Client, S3, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const fs = require('fs').promises; 

// Function to grab the secret name from AWS credentials manager
async function getSecret(secretName, region) {
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

// Function to grab s3 client object
async function s3client(accessKey, secretKey,region) {
    return new S3Client({
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
        region: region
         
    }); 
}

/*
(async() => {
    var access = JSON.parse(await getSecret('ytb-access-key','us-east-1'))['access']; 
    var secret = JSON.parse(await getSecret('ytb-secret','us-east-1'))['secret'];
    var bucket = JSON.parse(await getSecret('ytb-bucket', 'us-east-1'))['bucket']; 

    var fileBuffer = await readFileToBuffer('test.txt'); 

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: randomFileName(),
        Body: fileBuffer,
        ContentType: 'text/plain'
    })
    var s3 = s3client(access,secret,'us-east-1'); 
    (await s3).send(command); 
})(); 
*/ 

module.exports ={
  getSecret,
  s3client
}


