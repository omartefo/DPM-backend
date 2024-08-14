const Sequelize = require('sequelize');
const Joi = require('joi');

const { UserCompany } = require('./userCompanyModel');

const db = require('../db');

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
		type: Sequelize.STRING(8),
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
		mobileNumber: Joi.string().required().min(8).max(8),
		password: Joi.string().required().min(8),
		type: Joi.string().required().valid('Client'),
		fromAdmin: Joi.boolean().default(false),
	});

	return schema.validate(user);
}

exports.validate = validateUser;
exports.User = User;