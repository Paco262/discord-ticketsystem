const { EmbedBuilder } = require('discord.js');

function createLogEmbed(action, user, targetUser = null, ticketInfo = null) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Ticket ${action}`)
        .setTimestamp();

    switch (action) {
        case 'created':
            embed.setDescription(`Ein neues Ticket wurde von ${user.tag} erstellt.`);
            if (ticketInfo) {
                embed.addFields(
                    { name: 'Ticket-ID', value: ticketInfo.id.toString(), inline: true },
                    { name: 'Kategorie', value: ticketInfo.category, inline: true }
                );
            }
            break;
        case 'closed':
            embed.setDescription(`Ein Ticket wurde von ${user.tag} geschlossen.`);
            if (ticketInfo) {
                embed.addFields(
                    { name: 'Ticket-ID', value: ticketInfo.id.toString(), inline: true },
                    { name: 'Kategorie', value: ticketInfo.category, inline: true }
                );
            }
            break;
        case 'userAdded':
            embed.setDescription(`${user.tag} hat ${targetUser.tag} zum Ticket hinzugefügt.`);
            break;
        case 'userRemoved':
            embed.setDescription(`${user.tag} hat ${targetUser.tag} aus dem Ticket entfernt.`);
            break;
    }

    return embed;
}

module.exports = { createLogEmbed };