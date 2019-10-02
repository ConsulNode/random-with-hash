import 'dotenv/config';
import https from 'https';
import axios from 'axios';
import cron from 'node-cron';


/**
 * API variables
 * 
 * It is possible to verify list of delegators
 * for the block when winner was chosen.
 * Add height of the block to the CONSULNODE_API link.
 */
const EXPLORER_API = 'https://explorer-api.apps.minter.network/api/v1/';
const CONSULNODE_API = 'https://overview.consulnode.com/candidate?pub_key=Mpc9fc1052e075054cdbfb6443a6d14d97be9d4f19a10505c4323b52a78ca4bb18&height=';


// Start process every day
cron.schedule(process.env.CRON, () => {
  chooseWinner();
});


let chosenBlock = {};
let coins = [];
let validator = {};


async function chooseWinner() {
  chosenBlock = {};
  coins = [];
  validator = {};

  chosenBlock = await getBlock();
  coins = await getCoins();
  validator = await getDelegators(chosenBlock.height, coins);

  if (validator.delegators.length > 0 && chosenBlock.hash) {
    // Filter out delegators with total value less than 1000
    const delegatorsForRaffle = validator.delegators.filter(i => i.total_value >= 1000);
    
    const hashNumber = parseInt(chosenBlock.hash.substring(2, 6), 16);
    const winnerIndex = hashNumber % delegatorsForRaffle.length;
    const winner = delegatorsForRaffle[winnerIndex];

    let rewardForWinner = 500;
    if (new Date().getDay() === 5) rewardForWinner = 1000;
    if (new Date().getDate() === 27) rewardForWinner = 5000;

    // Send message via Telegram Bot
    sendFeed(`${new Date().toISOString().split('T')[0]}\r\nБлок: ${chosenBlock.height}\r\n\r\n🎁 Подарочные ${rewardForWinner} BIP будут зачислены\r\nⓂ️ ${winner.address}`);
  }
};


function getBlock() {
  return new Promise(resolve => {
    let chosenBlock = {};

    axios.get(`${EXPLORER_API}blocks`)
      .then(response => {
        const blocks = response.data.data;

        // Find first block after needed timestamp
        let i = 0;
        for (let block of blocks) {
          // 18 is hours number in UTC
          if (block.timestamp.split('T')[1].split(':')[0] < 18) {
            chosenBlock = {
              height: blocks[i - 1].height,
              hash: blocks[i - 1].hash,
              timestamp: blocks[i - 1].timestamp,
            };
            break;
          }

          i++;
        }

        resolve(chosenBlock);
      })
      .catch(error => {
        console.log(error);
      })
  });
};

function getCoins() {
  return new Promise(resolve => {
    let coins = [];

    axios.get(`${process.env.EXPLORER_API}coins`)
      .then(response => {
        coins = response.data.data;

        resolve(coins);
      })
      .catch(error => {
        console.log(error);
      });
  });
};

function getDelegators(chosenBlockHeight, coins) {
  return new Promise(resolve => {
    let delegators = [];

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    axios.get(`${CONSULNODE_API}${chosenBlockHeight}`, { httpsAgent })
      .then(response => {
        // Change stakes to float numbers
        const stakes = response.data.result.stakes.map(stake => {
          stake.value = +(stake.value * Math.pow(10, -18)).toFixed(4);
          stake.bip_value = +(stake.bip_value * Math.pow(10, -18)).toFixed(4);

          return stake;
        });

        // Combine different stakes from the same wallet
        stakes.forEach(item => {
          if (item.bip_value > 0 && verifyCoin(item.coin, coins)) {
            const index = delegators.findIndex(i => i.address === item.owner);

            if (index === -1) {
              let delegator = {
                address: item.owner,
                total_value: item.bip_value,
              };

              delegators.push(delegator);
            } else
              delegators[index].total_value = +(delegators[index].total_value + item.bip_value).toFixed(4);
          }
        });

        // DESC sort stakes by total value and wallet address
        delegators.sort((a, b) => {
          if (a.total_value < b.total_value)
            return 1;
          if (a.total_value > b.total_value)
            return -1;
          
          if (a.address < b.address)
            return 1;
          if (a.address > b.address)
            return -1;
          
          return 0;
        });

        resolve({
          delegators,
        });
      })
      .catch(error => {
        console.log(error);
      });
  });
};

function verifyCoin(coin, coins) {
  if (coin === 'BIP') return true;
  if (coins.find(item => item.symbol === coin).crr >= 50) return true;
  return false;
};
