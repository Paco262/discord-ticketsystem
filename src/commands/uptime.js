const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Zeigt an, wie lange der Bot schon online ist'),
    async execute(interaction) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Bot Uptime')
            .setDescription(`Ich bin seit folgender Zeit online:`)
            .addFields(
                { name: 'Tage', value: `${days}`, inline: true },
                { name: 'Stunden', value: `${hours}`, inline: true },
                { name: 'Minuten', value: `${minutes}`, inline: true },
                { name: 'Sekunden', value: `${seconds}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bot Uptime Information' });

        await interaction.reply({ embeds: [embed] });
    },
};