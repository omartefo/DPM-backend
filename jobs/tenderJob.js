const schedule = require('node-schedule');
const { Tender } = require('../models/tenderModel.js');
const constants = require('../utils/constants.js');

// Object to store scheduled jobs
const scheduledJobs = {};

// Schedule or reschedule a cron job
exports.scheduleTenderCronJob = async (tenderId, closingDate) => {
    // Cancel the existing job if it exists
    if (scheduledJobs[tenderId]) {
        scheduledJobs[tenderId].cancel();
        console.log(`Existing cron job for tenderId ${tenderId} canceled.`);
    }
    
    const job = schedule.scheduleJob(closingDate, async function() {
        try {
            const tender = await Tender.findByPk(tenderId, {
                attributes: ['tenderId', 'tenderNumber']
            });

            if (tender) {
                tender.status = constants.tenderStatuses.UNDER_EVALUATION;
                await tender.save();
                console.log(`Tender "${tender.tenderNumber}" status updated to ${constants.tenderStatuses.UNDER_EVALUATION}`);
            }
        } catch (error) {
            console.error(`Failed to update status for tender ${tenderId}:`, error);
        }
    });

    // Store the new job reference
    scheduledJobs[tenderId] = job;
    console.log(`Scheduler for tender ID ${tenderId} is set at ${closingDate}`);
    
    return job;
};