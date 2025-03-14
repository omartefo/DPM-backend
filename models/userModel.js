const Sequelize = require('sequelize');
const Joi = require('joi');

const { UserCompany } = require('./userCompanyModel');

const db = require('../db');
const constants = require('../utils/constants');

const User = db.define('user', 
{
	userId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
	},
	name: {
		type: Sequelize.STRING,
		allowNull: false
	},
	email: {
		type: Sequelize.STRING,
		allowNull: false,
		unique: true
	},
	mobileNumber: {
		type: Sequelize.STRING(constants.userConfig.MOBILE_NUMBER_LENGTH),
		allowNull: false,
		unique: true
	},
	password: {
		type: Sequelize.STRING,
		allowNull: false
	},
	isAccountActive: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	},
	isEmailVerified: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	},
	confirmationCode: Sequelize.STRING,
	passwordResetToken: Sequelize.STRING,
	passwordResetExpires: Sequelize.DATE,
	type: {
		type: Sequelize.STRING,			// Possible Types are Client, Supplier, Contractor, Consultant, Super_Admin, Admin, Employee
		allowNull: false
	},
	canParticipateInTenders: {
		type: Sequelize.BOOLEAN,
		defaultValue: true
	},
	companyId: {
		type: Sequelize.INTEGER,
		allowNull: true,
		references: {
			model: UserCompany,
			key: 'companyId',
			onDelete: 'RESTRICT'
		}
	}
});

function validateUser(user) {
	const schema = Joi.object({
		name: Joi.string().required().min(3),
		email: Joi.string().required().email(),
		mobileNumber: Joi.string().required().min(constants.userConfig.MOBILE_NUMBER_LENGTH).max(constants.userConfig.MOBILE_NUMBER_LENGTH),
		password: Joi.string().required().min(8),
		type: Joi.string().required().valid(constants.userTypes.CLIENT),
		fromAdmin: Joi.boolean().default(false),
	});

	return schema.validate(user);
}

exports.validate = validateUser;
exports.User = User;