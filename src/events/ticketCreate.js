const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Ticket } = require('../models/tickets');
const config = require('../../config.json');
const { createLogEmbed } = require('../utils/logEmbed');

async function sendTicketEmbed(channel, member, category, teamRole) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Ticket`)
            .setDescription(`Willkommen ${member.user.username} in deinem ${category} Ticket!`)
            .addFields(
                { name: 'Kategorie', value: category, inline: true },
                { name: 'Erstellt von', value: member.user.tag, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Ticket-System' });

        const deleteButton = new ButtonBuilder()
            .setCustomId('delete_ticket')
            .setLabel('Löschen')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(deleteButton);

        await channel.send({ content: `${teamRole}`, embeds: [embed], components: [row] });
        console.log('Embed sent successfully');
    } catch (error) {
        console.error('Error sending ticket embed:', error);
        throw error;
    }
}

async function execute(interaction) {
    if (interaction.deferred || interaction.replied) {
        console.log('Interaction already handled');
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        console.log('Interaction received:', interaction.customId);
        const guild = interaction.guild;
        const member = interaction.member;
        const category = interaction.values[0];

        console.log(`Attempting to create a ${category} ticket for: ${member.user.username}`);

        // Überprüfe, ob der Benutzer bereits ein offenes Ticket hat
        const existingTicket = await Ticket.findOne({
            where: {
                userId: member.id,
                status: 'open'
            }
        });

        if (existingTicket) {
            const channel = await guild.channels.fetch(existingTicket.channelId).catch(() => null);
            
            if (channel) {
                return interaction.editReply(`Du hast bereits ein offenes Ticket: ${channel}. Bitte schließe dieses zuerst, bevor du ein neues erstellst.`);
            } else {
                await Ticket.update({ status: 'closed' }, { where: { id: existingTicket.id } });
                console.log(`Altes Ticket ${existingTicket.id} wurde auf 'closed' gesetzt, da der Kanal nicht mehr existiert.`);
            }
        }

        const categoryConfig = config.ticketSystem.categories[category];
        if (!categoryConfig) {
            return interaction.editReply('Ungültige Ticket-Kategorie ausgewählt.');
        }

        const channelName = `ticket-${category}-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryConfig.channelId,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                },
                {
                    id: config.ticketSystem.teamRoleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
                },
            ],
        });

        const ticket = await Ticket.create({
            userId: member.id,
            channelId: channel.id,
            category: category,
            status: 'open'
        });

        const teamRole = guild.roles.cache.get(config.ticketSystem.teamRoleId);
        if (!teamRole) {
            console.error('Team-Rolle nicht gefunden');
        }

        console.log('Attempting to send ticket embed');
        await sendTicketEmbed(channel, member, category, teamRole);
        console.log('Ticket embed sent successfully');

        // Log the ticket creation
        const logChannel = await guild.channels.fetch(config.ticketSystem.logChannelId);
        if (logChannel) {
            const logEmbed = createLogEmbed('created', member.user, null, ticket);
            await logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.editReply(`${categoryConfig.name} Ticket erstellt! Bitte gehe zu ${channel}.`);
    } catch (error) {
        console.error('Error in ticketCreate:', error);
        if (!interaction.replied) {
            await interaction.editReply('Es gab einen Fehler beim Erstellen des Tickets. Bitte versuche es später erneut.');
        }
    }
}

module.exports = { execute };