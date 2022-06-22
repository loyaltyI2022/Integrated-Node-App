import { BlobServiceClient } from '@azure/storage-blob';
import openpgp from 'openpgp';
import fs, { ReadStream } from 'fs';
// import * as readline from 'node:readline';
import  { Writable } from 'stream';
import { chunk } from 'chunk';
import { Kafka } from 'kafkajs';
// import { disconnect } from 'process';



(async() => {

    const kafka = new Kafka({
        clientId: "local1",
        brokers: ["127.0.0.1:9092"],
    });

    const AZURE_STORAGE_CONNECTION_STRING = 'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;'

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

    const containerName = 'files';
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobName = 'gap_uat_profile_extract_huge_2021053111050202.csv.pgp';
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
   
    
    const outStream = new Writable();
    let data = '';

    outStream.write = function (chunk,encoding)  {
        const chunkData = chunk.toString();
        const n = chunkData.length;

        for (let i=0; i<n; i++) {
            if (chunkData[i] === '\n') {
                producer.send({
                    topic: 'topic1',
                    messages: [{value: data}]
                });

                console.log(`${data}\n\n`);
                data = '';
            } else {
                data += chunkData[i];
            }
        }   
        }
        
    //   decryptedData.on('end', async () => {
    //     await producer.disconnect();
    //   });
      
      decryptedData.data.pipe(outStream);


      // await producer.disconnect()

})();





