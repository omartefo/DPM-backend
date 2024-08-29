const moment = require('moment');

const { scheduleTenderCronJob } = require('./tenderJob.js');
const { Tender } = require('../models/tenderModel.js');
const constants = require('../utils/constants.js');

async function checkTenderClosing() {
    const openTenders = await Tender.findAll({
        where: { status: constants.tenderStatuses.OPEN },
        attributes: ['tenderId', 'tenderNumber', 'closingDate']
    });

    console.log('Open tenders =', openTenders);

    for (let tender of openTenders) {
        const { tenderId, closingDate, tenderNumber } = tender;

        const momentClosingDate = moment(closingDate);
        const currentDate = moment();
        const tenderClosingDatePassed = momentClosingDate.isBefore(currentDate);

        if (tenderClosingDatePassed) {
            tender.status = constants.tenderStatuses.UNDER_EVALUATION;
            await tender.save();
            console.log(`Tender "${tenderNumber}" status updated to ${constants.tenderStatuses.UNDER_EVALUATION}`);
        } else {
            await scheduleTenderCronJob(tenderId, closingDate);
        }
    }
}

module.exports = {
    checkTenderClosing,
    scheduleTenderCronJob,
};