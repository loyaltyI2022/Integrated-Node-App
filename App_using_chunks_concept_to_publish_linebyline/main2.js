import { BlobServiceClient } from '@azure/storage-blob';
import openpgp from 'openpgp';
import fs from 'fs';
import { Transform, Writable } from 'stream';
import { Kafka } from 'kafkajs';

(async() => {
    const AZURE_STORAGE_CONNECTION_STRING = 'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;'

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

    const containerName = 'files';
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobName = 'gap_uat_profile_extract_huge_2021053111050202.csv.pgp';
    // const blobName = 'gap_uat_profile_extract_2022042001000203.csv.gpg';
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

    decryptedData.data.highWaterMark = 10000;

    const kafka = new Kafka({brokers: ['localhost:9092'], clientId: 'test'});
    const producer = kafka.producer();
    await producer.connect();

    const t = new Transform({objectMode: true, 
    transform(chunk, encoding, done) {
        let data = chunk.toString();
        if (this._lastLineData)
        data = this._lastLineData + data;

        let lines = data.split('\n');
        this._lastLineData = lines.splice(lines.length-1, 1)[0];

        lines.forEach(this.push.bind(this));
        done();
    },
    flush(done){
        if (this._lastLineData) 
        this.push(this._lastLineData)
        this._lastLineData = null;
        done();
   }, highWaterMark: 10000});

    const w = new Writable({
        write: async(chunk, encoding, done) => {
            await producer.send({
                topic: 'topic11',
                messages: [{value: chunk}]
            });
            done();
        }, highWaterMark: 10000
    });

    decryptedData.data.pipe(t).pipe(w);
    
    t.on('end', () => {
        process.exit(1);
    });
})();
