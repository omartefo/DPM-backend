const Sequelize = require('sequelize');
const Joi = require('joi');

const { User } = require('./userModel');
const db = require('../db');

const DownloadCenter = db.define('downloads', 
{
	downloadId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
	},
	description: {
		type: Sequelize.STRING,
		allowNull: false
	},
	documents: {
		type: Sequelize.STRING,
		allowNull: false,
		get() {
			if (this.getDataValue('documents')) {
				return this.getDataValue('documents').split(';');
			}
		},
		set(val) {
		   this.setDataValue('documents', val.join(';'));
		},
	},
	uploadedBy: {
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: User,
			key: 'userId',
			onDelete: 'RESTRICT'
		}
	}
});

function validateDownloadCenter(upload) {
	const schema = Joi.object({
		description: Joi.string().required().max(1000)
	});

	return schema.validate(upload);
}

exports.validate = validateDownloadCenter;
exports.DownloadCenter = DownloadCenter;