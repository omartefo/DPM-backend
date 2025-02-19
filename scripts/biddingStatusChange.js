const dotEnv = require('dotenv');
dotEnv.config({ path: './config.env'});
const { Bidding } = require('../models/biddingModel');
const constants = require('../utils/constants');

async function init() {    
    await changeBiddingStatus();
    process.exit();
}

async function changeBiddingStatus() {
    console.log('Changing bidding status');
    let count = 0;

    require('../migration')();
    const sequelize = require('../db');
    await sequelize.sync();

    const biddings = await Bidding.findAll({ attributes: ['biddingId', 'status']});

    for (let bid of biddings) {
        if (bid.status && (bid.status === 'Qualified' || bid.status === 'Not_Qualified')) {
            console.log('bid found =', bid.status);
            count += 1;
            if (bid.status === 'Qualified') {
                bid.status = constants.biddingStatuses.IN_RANGE;
            }
            else {
                bid.status = constants.biddingStatuses.OUT_OF_RANGE;
            }

            await bid.save();
        }
    }

    console.log(`${count} bidding status updated...`);
}

init();