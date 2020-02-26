# Random with hash
Script for choosing a random wallet from the list of delegators based on the block hash.

**Steps**  
* Get list of delegators
* Combine different stakes from the same wallet adding up the total value
* Sort stakes by total value and wallet address in descending order
* Choose a random wallet based on the block hash

**Consul Node rules:**  
* Wallet gets chosen based on the first block after 9:00:00 UTC every day
* First three blocks after 9:00:00 are used every 27th for choosing three winners
