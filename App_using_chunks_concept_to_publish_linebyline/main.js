import { BlobServiceClient } from '@azure/storage-blob';
import openpgp from 'openpgp';
import fs, { ReadStream } from 'fs';
// import * as readline from 'node:readline';
import { Stream } from 'stream';
import { chunk } from 'chunk';
import { Kafka } from 'kafkajs';
import { Transform } from 'node:stream';
// import { disconnect } from 'process';



(async() => {
    
    const kafka = new Kafka({
        clientId: "local2",
        brokers: ["127.0.0.1:9092"],
    });

   
   
    //const stream = require('stream');
    const AZURE_STORAGE_CONNECTION_STRING = 'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;'

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

    const containerName = 'files';
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobName = 'gap_uat_profile_extract_2022042001000203.csv.gpg';
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const encryptedDataStream = (await blobClient.download(0)).readableStreamBody;
    encryptedDataStream.setEncoding('utf-8');


    const passphrase = 'Loy@ltymtlaccountmatch';
    const privateKeyArmored = fs.readFileSync('PrivateKey.asc', 'utf-8');
    
    

    const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({armoredKey: privateKeyArmored}),
        passphrase
    });
    
    const decryptedData = await openpgp.decrypt({
        message: await openpgp.readMessage({armoredMessage: encryptedDataStream}),
        decryptionKeys: privateKey,
        config: {allowUnauthenticatedStream: true}
    });

  

    
   // code starts for producer
   const producer = kafka.producer();
   await producer.connect();
   console.log("Producer connected");


   var liner = new Transform({objectmode: true});
  
   liner._transform = function (chunk, encoding, done) {
    var data = chunk.toString();
    if (this._lastLineData) data = this._lastLineData + data;

    var lines = data.split('\n');
   
   
    this._lastLineData = lines.splice(lines.length-1,1)[0];

    lines.forEach(this.push.bind(this));
  
    var line;
    while (null !== (line = liner.read())) {
        // do something with line
        producer.send({
            topic: 'topic2',
            messages: [
              { value: line,
               partition:  0,
                   },
            ],
          })
   }
    done();
};
      
    decryptedData.data.pipe(liner);


      // await producer.disconnect()

})();




