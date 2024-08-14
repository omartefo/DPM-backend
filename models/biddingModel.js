const Sequelize = require('sequelize');
const Joi = require('joi');

const { Tender } = require('./tenderModel');
const { User } = require('./userModel');

const db = require('../db');

const Bidding = db.define('bidding', 
{
	biddingId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
	},
	tenderId: {
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: Tender,
			key: 'tenderId',
			onDelete: 'RESTRICT'
		}
	},
	userId: {
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: User,
			key: 'userId',
			onDelete: 'RESTRICT'
		}
	},
	durationInLetters: Sequelize.STRING,
	durationInNumbers: Sequelize.STRING,
	priceInLetters: Sequelize.STRING,
	priceInNumbers: Sequelize.STRING,
	status: {								// Qualified 		- If price is in range of tender price
		type: Sequelize.STRING,				// Not_Qualified	- If price is NOT in range of tender price
		allowNull: true
	}
});

function validateBid(bid) {
	const schema = Joi.object({
		tenderId: Joi.number().required(),
		userId: Joi.number().required(),
		durationInLetters: Joi.string().allow(''),
		durationInNumbers: Joi.number().allow(''),
		priceInLetters: Joi.string().allow(''),
		priceInNumbers: Joi.number().allow(''),
	});

	return schema.validate(bid);
}

exports.validate = validateBid;
exports.Bidding = Bidding;