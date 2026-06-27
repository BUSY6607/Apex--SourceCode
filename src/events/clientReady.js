const recoverPendingReports = require(`../utils/recoverPendingReports`);
const { startReactivityChecker } = require(`../utils/reactivityChecker`);
const { startAntiRaidChecker } = require(`../utils/antiRaidChecker`);

module.exports = {

    name: `clientReady`,

    once: true,

    async execute(saim) {

        console.log(`logged in as ${saim.user.tag}`);

        try {

            console.log(`starting pending reports recovery process...`);

            await recoverPendingReports(saim);

            console.log(`pending reports recovery completed`);

        } catch (err) {

            console.log(`failed to recover pending reports`, err);

        }

        // ── Start Chat Reactivity background checker ────────────────────────
        try {

            startReactivityChecker(saim);

        } catch (err) {

            console.log(`failed to start chat reactivity checker`, err);

        }

        // ── Start Anti-Raid lockdown expiry checker ──────────────────────────
        try {

            startAntiRaidChecker(saim);

        } catch (err) {

            console.log(`failed to start anti-raid checker`, err);

        }

    }

};

