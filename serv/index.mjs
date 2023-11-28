import { DynamoDB, DynamoDBClient  } from '@aws-sdk/client-dynamodb';
import {  PutCommand, DynamoDBDocument, DynamoDBDocumentClient  } from '@aws-sdk/lib-dynamodb';
import { Storage } from '@google-cloud/storage';
import shell from 'shelljs';
import simpleGit from 'simple-git';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

let dbName = process.env.dbName
let gcpBucket = process.env.gcpBucket
let privateKey = process.env.privateKey

let base64PrivateKey = privateKey;
const text = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');

// console.log('key ',text)

const storage = new Storage({
    credentials: JSON.parse(text),
});

export const handler = async (event) => {
  const url = event.Records[0].Sns.Message;
  console.log('From SNS:', url);
    
  //download the code
  // const url = "https://github.com/NishithKody/Neetcode.git"
  const destination = '/tmp'

  // shell.exec('cd /tmp')
  // shell.exec(`mkdir test`)

  // simpleGit().clone(url, destination, (error, result) => {
  //   if (error) {
  //     console.error('Error cloning repository:', error);
  //   } else {
  //     console.log('Repository cloned successfully:', result);
  //   }
  // });
  
  //save in google cloud storage
  
  const bucket = storage.bucket(gcpBucket);

  await bucket.upload('./index.mjs', {
      destination: './test',
  });
  
  //send email
  
  //save the resp in db
  const command = new PutCommand({
    TableName: dbName,
    Item: {
      key: "Shiba Inu",
    },
  });
  const response = await docClient.send(command);
    
  return 200;
    
};