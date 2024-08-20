// 3rd party packages
const multer = require('multer');
const schedule = require('node-schedule');
const { Op } = require('sequelize');

// Models
const { Bidding } = require('../models/biddingModel');
const { UserNotification } = require('../models/notificationModel');
const { Project } = require('../models/projectsModel');
const { Tender, validate } = require('../models/tenderModel');
const { UserCompany } = require('../models/userCompanyModel');
const { User } = require('../models/userModel');

// Utils
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../utils/helpers');
const uploadToBlob = require('../utils/uploadToAzure');

async function markTenderAsClosed(tenderId) {
	const tenderToClose = await Tender.findByPk(tenderId);
	
	if (tenderToClose) {
		tenderToClose.status = 'Under Evaluation';
		await tenderToClose.save();
	}
}

const upload = multer({
	dest: 'temp/'
});

exports.uploadDocs = upload.array('documents', 100);

exports.getAllTenders = catchAsync(async (req, res, next) => {
	const search = req.query;
	const page = +req.query.page || 1;
	const limit = +req.query.limit || 10;
	let where = {};

	for (let key in search) {
		if (key === 'page' || key === 'limit') continue;

		where[key] = search[key];
	}

	const offset = (page - 1) * limit;

	const tenders = await Tender.findAll({
		where,
		limit,
		offset,
		include: [
			{
				model: Project, attributes: ['name']
			},
			{
				model: User, attributes: ['userId', 'name'],
				include: { model: UserCompany }
			}
		],
		order: [['createdAt', 'DESC']],
	});

	res.status(200).json({
		status: 'success',
		totalRecords: await Tender.count(),
		data: {
			tenders
		}
	});
});

exports.getTender = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;
	const tender = await Tender.findByPk(tenderId);
	const participants = await Bidding.count({ where: { tenderId } });

	if (!tender) return next(new AppError('No record found with given Id', 404));

	tender.dataValues.noOfParticipants = participants;

	res.status(200).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.createTender = catchAsync(async (req, res, next) => {
	const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	if (req.files) {
		const promises = [];
		req.files.forEach(file => promises.push(uploadToBlob(file)))
		req.body.documents = await Promise.all(promises);
	}

	const { tenderNumber, type, openingDate, closingDate, minimumPrice, maximumPrice, location, description, projectId, documents } = req.body;

	const tender = await Tender.create({ 
		tenderNumber,
		type,
		openingDate,
		closingDate,
		minimumPrice,
		maximumPrice,
		location, 
		description,
		projectId,
		documents
	});

	const tenderId = tender.dataValues.tenderId;

	schedule.scheduleJob(closingDate, async function() {
		await markTenderAsClosed(tenderId);
	}.bind(null, tenderId));
	
	res.status(201).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.updateTender = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;
	const tender = await Tender.update(req.body, { where: { tenderId }});

	if (!tender) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.deleteTender = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;
	const tender = await Tender.destroy({ where: { tenderId }});

	if (!tender) return next(new AppError('No record found with given Id', 404));

	res.status(204).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.awardTender = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;

	const userId = req.body.awardedTo;
	const company = req.body.company;

	const user = await User.findByPk(userId);
	const tender = await Tender.update({ awardedTo: userId, status: `Awarded to ${company}`}, { where: { tenderId }});

	const emailContent = `Congratulations, we are pleased to let you know that your company "${company}" has been selected for project`;
	const emailOptions = {
		email: user.email,
		subject: 'Awarded with tender',
		html:  `
			<h2>Hi, ${user.name}</h2>
			<p>${emailContent}</p>
		</div>`
	};

	await UserNotification.create({  userId: user.userId, type: 'email', content: emailContent, senderId: req.user.userId });
	await sendEmail(emailOptions);
	
	res.status(200).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.unAwardTender = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;

	const tender = await Tender.update({ awardedTo: null, status: `Under Evaluation`}, { where: { tenderId }});
		
	res.status(200).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.changeTenderStatus = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;
	const tender = await Tender.findByPk(tenderId);

	if (!tender) return next(new AppError('No record found with given Id', 404));
	
	const currentTime = new Date().getTime();
	if (tender.status === 'Open' && (new Date(tender.closingDate).getTime() - currentTime) < 0) {
		tender.status = 'Under Evaluation';
		await tender.save();
	}
	else {
		return next(new AppError('Can not change tender status', 400));
	}
		
	res.status(200).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.tenderBids = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;

	const bids = await Bidding.findAll({ 
		where: { tenderId, status: { [Op.ne]: null } }, 
		include: { model: User, include: { model: UserCompany, required: false }
	}});

	res.status(200).json({
		status: 'success',
		data: {
			bids
		}
	});
});