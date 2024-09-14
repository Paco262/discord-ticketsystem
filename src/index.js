const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token } = require('../config.json');
const { sequelize, Ticket } = require('./models/tickets');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ] 
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Es gab einen Fehler bei der Ausführung dieses Befehls!', ephemeral: true });
            }
        }
    }

});

async function checkTickets(client) {
    try {
        const tickets = await Ticket.findAll({ where: { status: 'open' } });
        for (const ticket of tickets) {
            const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
            if (!channel) {
                await Ticket.update({ status: 'closed' }, { where: { id: ticket.id } });
                console.log(`Ticket ${ticket.id} wurde auf 'closed' gesetzt, da der Kanal nicht mehr existiert.`);
            }
        }
    } catch (error) {
        console.error('Fehler beim Überprüfen der Tickets:', error);
    }
}

client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}!`);
    // Führe die Überprüfung alle 5 Minuten durch
    setInterval(() => checkTickets(client), 5 * 60 * 1000);
});

(async () => {
    try {
        await sequelize.sync();
        console.log('Datenbank synchronisiert');
        client.login(token);
    } catch (error) {
        console.error('Fehler beim Synchronisieren der Datenbank:', error);
    }
})();