import 'dotenv/config'
import axios from 'axios'
import cron from 'node-cron'


const API_VALIDATOR = 'https://explorer-api.apps.minter.network/api/v1/validators/Mpc9fc1052e075054cdbfb6443a6d14d97be9d4f19a10505c4323b52a78ca4bb18'
const API_COINS = 'https://explorer-api.apps.minter.network/api/v1/coins'


cron.schedule(process.env.CRON, () => {
  chooseWinner()
})


let coins = []
let delegators = []
let winner = ''


async function chooseWinner() {
  await getCoins()
  await getDelegators()
  
  winner = ''

  const winnerIndex = Math.floor(Math.random() * delegators.length)
  winner = delegators[winnerIndex].address

  rewardForWinner = 500
  if (new Date().getDay() === 5) rewardForWinner = 1000
  if (new Date().getDate() === 27) rewardForWinner = 5000
  
  axios.get(encodeURI(`https://api.telegram.org/bot${process.env.BOT}/sendMessage?chat_id=${process.env.CHAT}&text=${new Date().toISOString().split('T')[0]}\r\n\r\n🎁 Подарочные ${rewardForWinner} BIP будут зачислены\r\nⓂ️ ${winner}`))
}


function getCoins() {
  return new Promise(resolve => {
    coins = []

    axios.get(API_COINS)
      .then(response => {
        coins = response.data.data
        resolve()
      })
      .catch(error => {
        console.log(error)
      })
  })
}

function getDelegators() {
  return new Promise(resolve => {
    delegators = []

    axios.get(API_VALIDATOR)
      .then(response => {
        response.data.delegator_list.forEach(item => {
          if (verifyCoin(item.coin)) {
            const index = delegators.findIndex(i => i.address === item.address)

            if (index === -1)
              delegators.push({ address: item.address, value: Number(Number(item.bip_value).toFixed(2)) })
            else
              delegators[index].value = Number((delegators[index].value + Number(Number(item.bip_value).toFixed(2))).toFixed(2))
          }
        })

        delegators = delegators.filter(item => item.value >= 10)
        resolve()
      })
      .catch(error => {
        console.log(error)
      })
  })
}


function verifyCoin(coin) {
  if (coin === 'BIP') return true
  if (coins.find(item => item.symbol === coin).crr >= 55) return true
  return false
}
