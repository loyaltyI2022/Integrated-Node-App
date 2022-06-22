// first install modules of kafkajs then this code will work
// this code only creates a topic to a kafka cluster 
import { Kafka } from 'kafkajs';

async function createPartition() {
    const kafka = new Kafka({
        clientId: "local1",
        brokers: ["127.0.0.1:9092"],
    });

    const admin = kafka.admin();
    await admin.connect();
    // to create topics in kafka
    await admin.createTopics({
        topics: [
            {    // define topic and partition name here
                topic: "topic1",
                numPartitions: 1,
            },
        ],
    });
    console.log("Partitions created");
    await admin.disconnect();
}

createPartition();
