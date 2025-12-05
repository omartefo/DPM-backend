// 3rd party packages
const multer = require('multer');
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
const { uploadToBlob } = require('../utils/uploadToAzure');
const constants = require('../utils/constants');
const { scheduleTenderCronJob } = require('../jobs');

// Tender document max file size is 100MB
const upload = multer({
	dest: 'temp/',
    limits: { fileSize: 100 * 1024 * 1024 },
});

exports.uploadDocs = upload.fields([
	{ name: 'document1', maxCount: 1 },
	{ name: 'document2', maxCount: 1 },
	{ name: 'document3', maxCount: 1 }
]);

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

	const tenders = await Tender.findAndCountAll({
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

	await setTenderDocuments(req);

	const {
		tenderNumber,
		type,
		openingDate,
		closingDate,
		minimumPrice,
		maximumPrice,
		location,
		description,
		projectId,
		document1,
		document2,
		document3
	} = req.body;

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
		document1,
		document2,
		document3,
	});

	await scheduleTenderCronJob(tender.tenderId, closingDate);
	
	res.status(201).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.updateTender = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;
	
	await setTenderDocuments(req);

	const tender = await Tender.update(req.body, { where: { tenderId }});
	if (!tender) return next(new AppError('No record found with given Id', 404));

	const { closingDate } = req.body;
	if (closingDate) {
		await scheduleTenderCronJob(tenderId, closingDate);
	}

	res.status(200).json({
		status: 'success',
		data: {
			tender
		}
	});
});

exports.deleteTender = catchAsync(async (req, res, next) => {
	const tenderId = +req.params.id;

	const tender = await Tender.findByPk(tenderId);

	if (!tender) return next(new AppError('No record found with given Id', 404));

	await Bidding.destroy({ where: { tenderId } });
	await Tender.destroy({ where: { tenderId }});

	res.status(204).json({
		status: 'success',
		data: {}
	});
});

exports.awardTender = catchAsync(async (req, res, next) => {
	const tenderId = req.params.id;
	const { awardedTo: userId, company } = req.body;

	const user = await User.findByPk(userId, {
		attributes: ['userId', 'email', 'name']
	});

	if (!user) {
		return next(new AppError('user not found.'));
	}

	const tender = await Tender.update({ awardedTo: userId, status: `${constants.tenderStatuses.AWARDED}`}, { where: { tenderId }});

	if (!tender) {
		return next(new AppError('tender not found.'));
	}

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

	const tender = await Tender.update({ awardedTo: null, status: constants.tenderStatuses.UNDER_EVALUATION}, { where: { tenderId }});
		
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
	if (tender.status === constants.tenderStatuses.OPEN && (new Date(tender.closingDate).getTime() - currentTime) < 0) {
		tender.status = constants.tenderStatuses.UNDER_EVALUATION;
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

	const page = +req.query.page || 1;
	const limit = +req.query.limit || 10;
	const offset = (page - 1) * limit;
	const { company, status, stage } = req.query;

	const where = {
		tenderId,
		status: { [Op.ne]: null }
	};

	if (status) {
		where['status'] = status.replaceAll(' ', '_');
	}

	if (stage) {
		where['stage'] = stage;
	}

	const userCompanyInclude = {
		attributes: ['name', 'isVerifiedOnBinaa'],
		model: UserCompany,
		required: false
	};

	if (company) {
		userCompanyInclude.required = true;
		userCompanyInclude.where = { name: { [Op.like]: `%${company}%` } };
	}

	const userInclude = {
		model: User,
		attributes: ['userId'],
		include: userCompanyInclude,
		required: !!company    // inner join when filtering by company
	};

	const bids = await Bidding.findAndCountAll(
		{
			attributes: ['biddingId', 'priceInNumbers', 'durationInNumbers', 'status', 'stage'],
			where,
			limit,
			offset,
			include: userInclude,
			order: [['priceInNumbers', 'ASC']]
		});

	res.status(200).json({
		status: 'success',
		data: {
			bids
		}
	});
});

async function setTenderDocuments(req) {
	if (req.files) {
		const files = [];
		const promises = [];

		for (let key of Object.keys(req.files)) {
			files.push({ fileName: key, value: req.files[key][0] });
		}
		
		files.forEach(file => promises.push(uploadToBlob(file.value)))
		const azureFileUrls = await Promise.all(promises);
	
		for (let i=0; i<files.length; i++) {
			const key = files[i].fileName;
			const value = azureFileUrls[i];
	
			if (key === 'document1') {
				req.body.document1 = value;
			}
			if (key === 'document2') {
				req.body.document2 = value;
			}
			if (key === 'document3') {
				req.body.document3 = value;
			}
		}
	}
}