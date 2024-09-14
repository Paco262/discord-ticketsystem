const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Ticket } = require('../models/tickets');
const config = require('../../config.json');
const { createLogEmbed } = require('../utils/logEmbed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Entfernt einen Benutzer aus dem aktuellen Ticket (nur für Team-Mitglieder)')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Der Benutzer, der aus dem Ticket entfernt werden soll')
                .setRequired(true))
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
                return interaction.editReply('Dies ist kein offenes Ticket-Channel.');
            }

            const userToRemove = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(userToRemove.id);

            // Überprüfen, ob der Benutzer der Ticket-Ersteller ist
            if (ticket.userId === userToRemove.id) {
                return interaction.editReply('Der Ticket-Ersteller kann nicht aus dem Ticket entfernt werden.');
            }

            // Überprüfen, ob der Benutzer Zugriff auf das Ticket hat
            if (!interaction.channel.permissionsFor(member).has(PermissionFlagsBits.ViewChannel)) {
                return interaction.editReply(`${userToRemove} hat keinen Zugriff auf dieses Ticket.`);
            }

            // Berechtigungen für den Benutzer entfernen
            await interaction.channel.permissionOverwrites.delete(member);

            await interaction.editReply(`${userToRemove} wurde erfolgreich aus dem Ticket entfernt.`);

            // Benachrichtigung im Ticket-Channel senden
            await interaction.channel.send(`${userToRemove} wurde von ${interaction.user} aus dem Ticket entfernt.`);

            // Log the user removal
            const logChannel = await interaction.guild.channels.fetch(config.ticketSystem.logChannelId);
            if (logChannel) {
                const logEmbed = createLogEmbed('userRemoved', interaction.user, userToRemove);
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Fehler beim Entfernen des Benutzers aus dem Ticket:', error);
            await interaction.editReply('Es gab einen Fehler beim Entfernen des Benutzers aus dem Ticket. Bitte versuche es später erneut.');
        }
    },
};