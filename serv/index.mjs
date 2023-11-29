import { DynamoDB, DynamoDBClient  } from '@aws-sdk/client-dynamodb';
import {  PutCommand, DynamoDBDocument, DynamoDBDocumentClient  } from '@aws-sdk/lib-dynamodb';
import { Storage } from '@google-cloud/storage';
// import formData from 'form-data';
// import Mailgun from 'mailgun.js';
import https from 'https';
import fs from 'fs';
import path from 'path';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

let dbName = process.env.dbName
let gcpBucket = process.env.gcpBucket
let privateKey = process.env.privateKey
let mailKey = process.env.mailKey

let base64PrivateKey = privateKey;
const text = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');


const storage = new Storage({
    credentials: JSON.parse(text),
});

export const handler = async (event) => {
  const msg = event.Records[0].Sns.Message;
  let [email, url] = msg.split(',')
  console.log('From SNS:', url);
    
  //download the code

  // const fileUrl = 'https://github.com/NishithNishith/INFO6150/archive/refs/heads/main.zip';
  const fileUrl = url;
  const fileName = path.join('/tmp', 'myfile.zip');
  
  const file = fs.createWriteStream(fileName);
  
  let mailMsg = "Your assignment was submitted successfully"
  let status = 1;
  
  try{
    https.get(fileUrl, response => {
    response.pipe(file);
  
    file.on('finish', () => {
      file.close();
    });
    }).on('error', error => {
      console.log('error while downloading the file');
      status = 0;
      fs.unlink(fileName);
    });
    console.log('the file was downloaded')
  }
  catch(err){
    console.log('error while downloading the file2');
    status = 0;
  }
  
  
  console.log('status',status)
  
  
  //save in google cloud storage
  
  // const bucket = storage.bucket(gcpBucket);

  // await bucket.upload('./index.mjs', {
  //     destination: './test',
  // });
  
  //send email

  // const mailgun = new Mailgun(formData);
  // const client = mailgun.client({username: 'api', key: mailKey});

  // client.messages.create('sandbox-123.mailgun.org', {
  //   from: "Excited User <mailgun@sandbox-123.mailgun.org>",
  //   to: ["nishith0514@gmail.com"],
  //   subject: "Hello",
  //   text: "Testing some Mailgun awesomeness!",
  //   html: "<h1>Testing some Mailgun awesomeness!</h1>"
  // })
  // .then(msg => console.log(msg)) // logs response data
  // .catch(err => console.log(err)); // logs any error

  
  //save the resp in db
  const command = new PutCommand({
    TableName: dbName,
    Item: {
      email: email,
      submission: url
    },
  });
  const response = await docClient.send(command);
    
  return 200;
    
};