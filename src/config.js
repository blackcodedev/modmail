const json5 = require('json5');
const fs = require('fs');
const path = require('path');

let userConfig;

// Try to find our config file from several options
const configFiles = [
  'config.json',
  'config.json5',
  'config.json.json',
  'config.json.txt',
  'config.js'
];

let foundConfigFile;

for (const configFile of configFiles) {
  try {
    fs.accessSync(__dirname + '/../' + configFile);
    foundConfigFile = configFile;
    break;
  } catch (e) {}
}

if (! foundConfigFile) {
  throw new Error(`Could not find config.json!`);
}

// Parse the config using JSON5
try {
  if (foundConfigFile.endsWith('.js')) {
    userConfig = require(`../${foundConfigFile}`);
  } else {
    const raw = fs.readFileSync(__dirname + '/../' + foundConfigFile);
    userConfig = json5.parse(raw);
  }
} catch (e) {
  throw new Error(`Error reading config file! The error given was: ${e.message}`);
}

const defaultConfig = {
  "token": process.env.token,
  "mailGuildId": null,
  "mainGuildId": null,
  "logChannelId": null,

  "prefix": "!",
  "snippetPrefix": "!!",
  "snippetPrefixAnon": "!!!",

  "status": "Message me for help!",
  "responseMessage": "Thank you for your message! Our mod team will reply to you here as soon as possible.",
  "closeMessage": null,
  "allowUserClose": false,

  "newThreadCategoryId": "830515229905256478",
  "mentionRole": "824304979288260630",
  "pingOnBotMention": true,
  "botMentionResponse": null,

  "inboxServerPermission": null,
  "alwaysReply": true,
  "alwaysReplyAnon": false,
  "useNicknames": false,
  "ignoreAccidentalThreads": false,
  "threadTimestamps": false,
  "allowMove": false,
  "syncPermissionsOnMove": true,
  "typingProxy": false,
  "typingProxyReverse": false,
  "mentionUserInThreadHeader": true,
  "rolesInThreadHeader": false,

  "enableGreeting": false,
  "greetingMessage": null,
  "greetingAttachment": null,

  "guildGreetings": {},

  "requiredAccountAge": "168", // In hours
  "accountAgeDeniedMessage": "Hesabınız 7 günden önce oluşturulduğu için bu sistemi kullanamazsınız.",

  "requiredTimeOnServer": "60", // In minutes
  "timeOnServerDeniedMessage": "Bu sistemi kullanabilmek için en az 60 dakika önce sunucuya katılmış olmanız gerek.",

  "relaySmallAttachmentsAsAttachments": false,
  "smallAttachmentLimit": 1024 * 1024 * 2,
  "attachmentStorage": "local",
  "attachmentStorageChannelId": null,

  "categoryAutomation": {},

  "updateNotifications": true,
  "plugins": [],

  "commandAliases": {},

  "port": 8890,
  "url": null,

  "dbDir": path.join(__dirname, '..', 'db'),
  "knex": null,

  "logDir": path.join(__dirname, '..', 'logs'),
};

const required = ['token','mailGuildId', 'mainGuildId', 'logChannelId'];

const finalConfig = Object.assign({}, defaultConfig);

for (const [prop, value] of Object.entries(userConfig)) {
  if (! defaultConfig.hasOwnProperty(prop)) {
    throw new Error(`Invalid option: ${prop}`);
  }

  finalConfig[prop] = value;
}

// Default knex config
if (! finalConfig['knex']) {
  finalConfig['knex'] = {
    client: 'sqlite',
      connection: {
      filename: path.join(finalConfig.dbDir, 'data.sqlite')
    },
    useNullAsDefault: true
  };
}

// Make sure migration settings are always present in knex config
Object.assign(finalConfig['knex'], {
  migrations: {
    directory: path.join(finalConfig.dbDir, 'migrations')
  }
});

// Make sure all of the required config options are present
for (const opt of required) {
  if (! finalConfig[opt]) {
    console.error(`Missing required config.json value: ${opt}`);
    process.exit(1);
  }
}

if (finalConfig.smallAttachmentLimit > 1024 * 1024 * 8) {
  finalConfig.smallAttachmentLimit = 1024 * 1024 * 8;
  console.warn('[WARN] smallAttachmentLimit capped at 8MB');
}

// Specific checks
if (finalConfig.attachmentStorage === 'discord' && ! finalConfig.attachmentStorageChannelId) {
  console.error('Config option \'attachmentStorageChannelId\' is required with attachment storage \'discord\'');
  process.exit(1);
}

// Make sure mainGuildId is internally always an array
if (! Array.isArray(finalConfig['mainGuildId'])) {
  finalConfig['mainGuildId'] = [finalConfig['mainGuildId']];
}

// Make sure inboxServerPermission is always an array
if (! Array.isArray(finalConfig['inboxServerPermission'])) {
  if (finalConfig['inboxServerPermission'] == null) {
    finalConfig['inboxServerPermission'] = [];
  } else {
    finalConfig['inboxServerPermission'] = [finalConfig['inboxServerPermission']];
  }
}

// Move greetingMessage/greetingAttachment to the guildGreetings object internally
// Or, in other words, if greetingMessage and/or greetingAttachment is set, it is applied for all servers that don't
// already have something set up in guildGreetings. This retains backwards compatibility while allowing you to override
// greetings for specific servers in guildGreetings.
if (finalConfig.greetingMessage || finalConfig.greetingAttachment) {
  for (const guildId of finalConfig.mainGuildId) {
    if (finalConfig.guildGreetings[guildId]) continue;
    finalConfig.guildGreetings[guildId] = {
      message: finalConfig.greetingMessage,
      message: finalConfig.greetingMessage
    };
  }
}

// newThreadCategoryId is syntactic sugar for categoryAutomation.newThread
if (finalConfig.newThreadCategoryId) {
  finalConfig.categoryAutomation.newThread = finalConfig.newThreadCategoryId;
  delete finalConfig.newThreadCategoryId;
}

module.exports = finalConfig;
