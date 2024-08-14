const Sequelize = require('sequelize');
const Joi = require('joi');

const { User } = require('./userModel');

const db = require('../db');

const Notification = db.define('notification', 
{
	notificationId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
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
	type: {								// Email, SMS
		type: Sequelize.STRING,
		allowNull: true
	},
	content: {
		type: Sequelize.STRING,
		allowNull: true
	},
	senderId: {
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: User,
			key: 'userId',
			onDelete: 'RESTRICT'
		}
	},
});

function validateNotification(notification) {
	const schema = Joi.object({
		userId: Joi.number().required(),
		type: Joi.string().required(),
		content: Joi.string().required(),
	});

	return schema.validate(notification);
}

exports.validate = validateNotification;
exports.UserNotification = Notification;