import { DynamoDB, DynamoDBClient  } from '@aws-sdk/client-dynamodb';
import {  PutCommand, DynamoDBDocument, DynamoDBDocumentClient  } from '@aws-sdk/lib-dynamodb';
import { Storage } from '@google-cloud/storage';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

let dbName = process.env.dbName
let gcpBucket = process.env.gcpBucket
let privateKey = process.env.privateKey
let mailKey = process.env.mailKey

let API_KEY = mailKey;
const DOMAIN = 'neucloud.me';
const mailgun = new Mailgun(formData);
const mgclient = mailgun.client({username: 'api', key: API_KEY});

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
  let d =  Date.now()
  
  let file_path = `submission-${d}.zip`;
  const fileName = path.join('/tmp', file_path);
  
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
            // fs.unlink(fileName);
            
            return 200
    });
    console.log('the file was downloaded')
  }
  catch(err){
    console.log('error while downloading the file2');
    status = 0;

    const messageData = {
      from: 'neucloud <mail@neucloud.me>',
      to: 'nishith0514@gmail.com',
      subject: 'Submission Update',
      text: `Your submission was not uploaded successfully. Please provide valid path`
    };
    
    mgclient.messages.create(DOMAIN, messageData)
     .then((res) => {
       console.log(res);
     })
     .catch((err) => {
       console.error(err);
     });
    
    const command = new PutCommand({
      TableName: dbName,
      Item: {
        email: email,
        submission: "failed-"+url+d
      },
    });
    const response = await docClient.send(command);
  
    return 200
  }


  //save in google cloud storage
  
  const bucket = storage.bucket(gcpBucket);
  
  console.log('gcpBucket',gcpBucket)
  
  console.log('gcp filename',fileName)

  await bucket.upload(fileName, {
      destination: file_path,
  });
  
  //send email

  console.log('the email',email)
  
  const messageData = {
    from: 'neucloud <mail@neucloud.me>',
    to: 'nishith0514@gmail.com',
    subject: 'Submission Update',
    text: `Your submission was uploaded successfully! The file -${url} was uploaded to the bucket - ${gcpBucket}/${file_path}`
  };
  
  mgclient.messages.create(DOMAIN, messageData)
   .then((res) => {
     console.log(res);
   })
   .catch((err) => {
     console.error(err);
   });
  


  
  //save the resp in db
  const command = new PutCommand({
    TableName: dbName,
    Item: {
      email: email,
      submission: url+d
    },
  });
  const response = await docClient.send(command);
    
  return 200;
    
};