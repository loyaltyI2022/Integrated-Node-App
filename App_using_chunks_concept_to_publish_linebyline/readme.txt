Steps to run
First we will have to upload all the node modules required to run this application.  Look at the imported modules in main.js and look for the npm code in google to install it.
Then run partition to create a kafka topic
Then run main.js to publish data to kafka topic


Basic info
Currently this code is working but it can show error while publishing some messages as a large amount of messages are going to be produced in the topics
We are publishing messages when we detect a space so we are publishing every string which is separated by a space
We will have to optimise it to send only lines 
