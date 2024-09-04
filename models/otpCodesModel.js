const Sequelize = require('sequelize');
const Joi = require('joi');

const db = require('../db');
const constants = require('../utils/constants');

const OTPCode = db.define('otpCode', 
{
	otpCodeId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
	},
	mobileNumber: {
		type: Sequelize.STRING(constants.userConfig.MOBILE_NUMBER_LENGTH),
		allowNull: false,
	},
	code: Sequelize.INTEGER,
	expiresAt: Sequelize.DATE
});

function validateOTPCode(otpCode) {
	const schema = Joi.object({
		mobileNumber: Joi.string().required().min(constants.userConfig.MOBILE_NUMBER_LENGTH).max(constants.userConfig.MOBILE_NUMBER_LENGTH),
		code: Joi.string().required().min(4).max(4)
	});

	return schema.validate(otpCode);
}

exports.validate = validateOTPCode;
exports.OTPCode = OTPCode;