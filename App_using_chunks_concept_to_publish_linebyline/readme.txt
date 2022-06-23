Steps to run
Go to the terminal and type npm install and install azure blob modules
Then run partition to create a kafka topic
Then run main2.js to publish data to kafka topic


Basic info
Currently this code is working but it can show error while publishing some messages as a large amount of messages are going to be produced in the topics
We are publishing messages when we detect a space so we are publishing every string which is separated by a space

Update
Use main2.js as this file is updated and it publish messages separated by newline


