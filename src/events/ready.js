const { ActivityType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Eingeloggt als ${client.user.tag}!`);
        
        // Setze den Bot-Status aus der Konfiguration
        const activityType = ActivityType[config.botStatus.type];
        client.user.setActivity(config.botStatus.activity, { type: activityType });

        const channelId = config.ticketSystem.channelId;
        console.log('Versuche, den Kanal zu finden...');
        const channel = await client.channels.fetch(channelId).catch(error => {
            console.error('Fehler beim Abrufen des Kanals:', error);
            return null;
        });

        if (channel && channel.type === ChannelType.GuildText) {
            console.log('Kanal gefunden. Versuche, Nachrichten zu löschen...');
            // Lösche alle vorherigen Nachrichten
            try {
                const messages = await channel.messages.fetch();
                await channel.bulkDelete(messages);
                console.log('Nachrichten erfolgreich gelöscht.');
            } catch (error) {
                console.error('Fehler beim Löschen der Nachrichten:', error);
            }

            console.log('Erstelle Embed und Select-Menü...');
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Ticket-System')
                .setDescription('Wähle eine Kategorie aus dem Dropdown-Menü unten, um ein neues Ticket zu öffnen.');

            const select = new StringSelectMenuBuilder()
                .setCustomId('create_ticket')
                .setPlaceholder('Wähle eine Kategorie');

            for (const [key, category] of Object.entries(config.ticketSystem.categories)) {
                select.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(category.name)
                        .setDescription(category.description)
                        .setValue(key)
                );
            }

            const row = new ActionRowBuilder().addComponents(select);

            console.log('Versuche, Embed zu senden...');
            try {
                await channel.send({ embeds: [embed], components: [row] });
                console.log('Ticket-System wurde erfolgreich eingerichtet!');
            } catch (error) {
                console.error('Fehler beim Senden des Embeds:', error);
            }
        } else {
            console.error('Der angegebene Kanal wurde nicht gefunden oder ist kein Textkanal.');
        }
    },
};