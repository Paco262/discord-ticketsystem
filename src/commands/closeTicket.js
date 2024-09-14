const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Ticket } = require('../models/tickets');
const config = require('../../config.json');
const { createLogEmbed } = require('../utils/logEmbed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Schließt das aktuelle Ticket (nur für Team-Mitglieder)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        // Überprüfen, ob der Benutzer die Team-Rolle hat
        if (!interaction.member.roles.cache.has(config.ticketSystem.teamRoleId)) {
            return interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const ticket = await Ticket.findOne({
                where: {
                    channelId: interaction.channel.id,
                    status: 'open'
                }
            });

            if (!ticket) {
                return interaction.editReply('Dies ist kein offenes Ticket-Channel oder das Ticket wurde bereits geschlossen.');
            }

            const user = await interaction.client.users.fetch(ticket.userId);
            if (user) {
                const closedEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Ticket geschlossen')
                    .setDescription(`Dein Ticket "${interaction.channel.name}" wurde geschlossen.`)
                    .addFields(
                        { name: 'Ticket-ID', value: ticket.id.toString(), inline: true },
                        { name: 'Geschlossen von', value: interaction.user.tag, inline: true },
                        { name: 'Kategorie', value: ticket.category, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Ticket-System' });

                try {
                    await user.send({ embeds: [closedEmbed] });
                    console.log('DM mit Embed erfolgreich gesendet');
                } catch (error) {
                    console.error('Fehler beim Senden der DM:', error);
                }
            }

            await Ticket.update({ status: 'closed' }, {
                where: {
                    channelId: interaction.channel.id
                }
            });

            // Log the ticket closure
            const logChannel = await interaction.guild.channels.fetch(config.ticketSystem.logChannelId);
            if (logChannel) {
                const logEmbed = createLogEmbed('closed', interaction.user, null, ticket);
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.editReply('Ticket wird geschlossen...');
            
            // Verzögerung hinzufügen, um sicherzustellen, dass die Nachricht gesendet wurde
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('Fehler beim Löschen des Kanals:', error);
                }
            }, 1000);
        } catch (error) {
            console.error('Fehler beim Schließen des Tickets:', error);
            await interaction.editReply('Es gab einen Fehler beim Schließen des Tickets. Bitte versuche es später erneut.');
        }
    },
};