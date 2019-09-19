# Random
Script for choosing a random wallet from the list of delegators based on the block hash.

**Steps**  
* Get list of delegators
* Combine different stakes from the same wallet adding up the total value
* Sort stakes by total value and wallet address in descending order
* Choose a random wallet based on the block hash
