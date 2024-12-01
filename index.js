const axios = require('axios');
const cheerio = require('cheerio');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const winston = require('winston');

const config = {
  discordToken: 'TOKEN',
  targetUserId: 'USERID',
  productUrl: 'https://us.store.bambulab.com/products/bambu-textured-pei-plate?variant=41208916050056',
  statusSelector: 'button[data-action="add-to-cart"] .cart-button-text',
  inStockText: 'Add to cart',
  checkIntervalMs: 600000
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

let notificationSent = false;

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}`);
  monitorProduct();
});

async function monitorProduct() {
  while (true) {
    try {
      logger.info('Checking product availability...');

      const { data } = await axios.get(config.productUrl);
      const $ = cheerio.load(data);
      const buttonText = $(config.statusSelector).text().trim();

      if (buttonText === config.inStockText) {
        if (!notificationSent) {
          const message = `🚨 **Product Available!** 🚨\n${config.productUrl}\nTime: ${new Date().toLocaleString()}`;
          const user = await client.users.fetch(config.targetUserId);
          await user.send(message);
          logger.info('Notification sent to user.');
          notificationSent = true;
        } else {
          logger.info('Product is still available, notification already sent.');
        }
      } else {
        logger.info('Product is out of stock.');
        notificationSent = false;
      }
    } catch (error) {
      logger.error(`Error checking product status: ${error.message}`);
      await retryDelay();
    }
    await delay(config.checkIntervalMs);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryDelay() {
  const retryTime = 60000;
  logger.warn(`Retrying in ${retryTime / 1000} seconds...`);
  await delay(retryTime);
}

client.login(config.discordToken);
