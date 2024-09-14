const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Ticket } = require('../models/tickets');
const config = require('../../config.json');
const { createLogEmbed } = require('../utils/logEmbed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Fügt einen Benutzer zum aktuellen Ticket hinzu (nur für Team-Mitglieder)')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Der Benutzer, der zum Ticket hinzugefügt werden soll')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {

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

            const userToAdd = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(userToAdd.id);


            if (interaction.channel.permissionsFor(member).has(PermissionFlagsBits.ViewChannel)) {
                return interaction.editReply(`${userToAdd} hat bereits Zugriff auf dieses Ticket.`);
            }


            await interaction.channel.permissionOverwrites.edit(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.editReply(`${userToAdd} wurde erfolgreich zum Ticket hinzugefügt.`);


            await interaction.channel.send(`${userToAdd} wurde von ${interaction.user} zum Ticket hinzugefügt.`);


            const logChannel = await interaction.guild.channels.fetch(config.ticketSystem.logChannelId);
            if (logChannel) {
                const logEmbed = createLogEmbed('userAdded', interaction.user, userToAdd);
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Fehler beim Hinzufügen des Benutzers zum Ticket:', error);
            await interaction.editReply('Es gab einen Fehler beim Hinzufügen des Benutzers zum Ticket. Bitte versuche es später erneut.');
        }
    },
};