const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Ticket } = require('../models/tickets');
const { execute: executeTicketCreate } = require('./ticketCreate');
const { createLogEmbed } = require('../utils/logEmbed');
const config = require('../../config.json');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isButton()) {
            if (interaction.customId === 'delete_ticket') {
                const confirmEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Ticket löschen')
                    .setDescription('Bist du sicher, dass du dieses Ticket löschen möchtest?');

                const confirmButton = new ButtonBuilder()
                    .setCustomId('confirm_delete')
                    .setLabel('Löschen')
                    .setStyle(ButtonStyle.Danger);

                const cancelButton = new ButtonBuilder()
                    .setCustomId('cancel_delete')
                    .setLabel('Abbrechen')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
            } else if (interaction.customId === 'confirm_delete') {
                await interaction.deferReply({ ephemeral: true });
                
                const ticket = await Ticket.findOne({
                    where: {
                        channelId: interaction.channel.id
                    }
                });

                if (ticket) {
                    const user = await interaction.client.users.fetch(ticket.userId);
                    if (user) {
                        try {
                            const closedEmbed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('Ticket geschlossen')
                                .setDescription(`Dein Ticket "${interaction.channel.name}" wurde geschlossen.`)
                                .addFields(
                                    { name: 'Ticket-ID', value: ticket.id.toString(), inline: true },
                                    { name: 'Geschlossen von', value: interaction.user.tag, inline: true }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Ticket-System' });

                            await user.send({ embeds: [closedEmbed] });
                            console.log('DM mit Embed erfolgreich gesendet');
                        } catch (error) {
                            console.error('Fehler beim Senden der DM:', error);
                        }
                    }

                    // Log the ticket closure
                    const logChannel = await interaction.guild.channels.fetch(config.ticketSystem.logChannelId);
                    if (logChannel) {
                        const logEmbed = createLogEmbed('closed', interaction.user, null, ticket);
                        await logChannel.send({ embeds: [logEmbed] });
                    }

                    await Ticket.destroy({
                        where: {
                            channelId: interaction.channel.id
                        }
                    });
                }

                await interaction.editReply('Ticket wird geschlossen...');
                await interaction.channel.delete();
            } else if (interaction.customId === 'cancel_delete') {
                await interaction.update({ content: 'Ticket-Löschung abgebrochen.', embeds: [], components: [], ephemeral: true });
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'create_ticket') {
                try {
                    await executeTicketCreate(interaction);
                } catch (error) {
                    console.error('Error executing ticketCreate:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: 'Es gab einen Fehler bei der Verarbeitung deiner Anfrage.', ephemeral: true });
                    }
                }
            }
        }
    },
};