const Sequelize = require('sequelize');
const Joi = require('joi');

const { Project } = require('./projectsModel');
const { User } = require('./userModel');

const db = require('../db');

const Tender = db.define('tender', 
{
	tenderId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
	},
	tenderNumber: {
		type: Sequelize.STRING,
		allowNull: false
	},
	type: {
		type: Sequelize.STRING,
		allowNull: false
	},
	openingDate: {
		type: Sequelize.DATE,
		allowNull: false,
	},
	closingDate: {
		type: Sequelize.DATE,
		allowNull: false,
	},
	minimumPrice: {
		type: Sequelize.INTEGER,
		allowNull: false,
	},
	maximumPrice: {
		type: Sequelize.INTEGER,
		allowNull: false,
	},
	location: {							// Doha, Al Rayyan, Umm Salal, Al Khor & Al Thakira, Al Wakrah, Al Daayen, Al Shamal, and Al Shahaniya
		type: Sequelize.STRING,
		allowNull: false,
	},
	description: {
		type: Sequelize.STRING(1000),
		allowNull: false
	},
	status: {							// Tender status: 'Open', 'Under Evaluation', 'Awarded to xxx Company'
		type: Sequelize.STRING,
		allowNull: false,
		defaultValue: 'Open'
	},
	documents: {
		type: Sequelize.STRING,
		get() {
			if (this.getDataValue('documents')) {
				return this.getDataValue('documents').split(';');
			}
		},
		set(val) {
			if (val) {
				this.setDataValue('documents', val.join(';'));
			}
		},
	},
	projectId: {
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: Project,
			key: 'projectId',
			onDelete: 'RESTRICT'
		}
	},
	awardedTo: {
		type: Sequelize.INTEGER,
		allowNull: true,
		references: {
			model: User,
			key: 'userId',
			onDelete: 'RESTRICT'
		}
	}
});

function validateTender(tender) {
	const schema = Joi.object({
		tenderNumber: Joi.string().required(),
		type: Joi.string().required(),
		openingDate: Joi.date().required(),
		closingDate: Joi.date().required(),
		minimumPrice: Joi.number().required(),
		maximumPrice: Joi.number().required(),
		location: Joi.string().required(),
		description: Joi.string().required().max(1000),
		projectId: Joi.number().required(),
		documents: Joi.string().allow(''),
	});

	return schema.validate(tender);
}

exports.validate = validateTender;
exports.Tender = Tender;