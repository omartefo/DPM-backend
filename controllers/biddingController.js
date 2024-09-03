// 3rd party packages
const moment = require("moment/moment");
const schedule = require('node-schedule');
const { Op } = require('sequelize');

// Models
const { Bidding, validate } = require("../models/biddingModel");
const { Tender } = require("../models/tenderModel");
const { UserCompany } = require("../models/userCompanyModel");
const { User } = require("../models/userModel");

// Utils
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { sendEmail } = require("../utils/helpers");
const constants = require("../utils/constants");

exports.getAllBids = catchAsync(async (req, res, next) => {
	const search = req.query;

	const page = +req.query.page || 1;
	const limit = +req.query.limit || 10;

	let where = {};

	for (let key in search) {
		if (key === 'page' || key === 'limit') continue;

		where[key] = search[key];
	}

	const offset = (page - 1) * limit;

	const bids = await Bidding.findAll({
		limit,
		offset,
		include: [
		{ 
			model: User, attributes: ['name', 'mobileNumber'],
			include: { model: UserCompany, attributes: ['companyId', 'name'] }
		},
		{
			model: Tender, attributes: ['tenderNumber'], where
		}]
	});

	res.status(200).json({
		status: 'success',
		totalRecords: await Bidding.count(),
		data: {
			bids
		}
	});
});

exports.getBiddersByTenderId = catchAsync(async (req, res, next) => {
	const tenderId = +req.params.id;
	if (!tenderId) return next(new AppError('Tender id is required.'), 400);

	const bidders = await Bidding.findAll({ 
		where: { tenderId, status: { [Op['ne']]: null }}, 
		include: {
			model: User, attributes: ['userId', 'name'],
			include: { model: UserCompany, attributes: ['companyId', 'name'] }
		},
		attributes: ['biddingId', 'priceInNumbers']
	});

	res.status(200).json({
		status: 'success',
		data: {
			bidders
		}
	});
});

exports.getBidsByUserId = catchAsync(async (req, res, next) => {
	const userId = req.body.userId || req.user.userId;

	const bids = await Bidding.findAndCountAll({ 
		where: { userId }, 
		include: { model: Tender },
		attributes: ['biddingId']
	});

	res.status(200).json({
		status: 'success',
		data: {
			bids
		}
	});
});

exports.participateInBidding = catchAsync(async (req, res, next) => {
	const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	const tender = await Tender.findByPk(req.body.tenderId);
	if (!tender) return next(new AppError('Could not found tender with the given Id', 404));

	// Check tender's opening and closing dates
	const currentTime = new Date().getTime();
	const tenderOpeningTime = new Date(tender.openingDate).getTime();
	const tenderClosingTime = new Date(tender.closingDate).getTime();

	if (!(currentTime > tenderOpeningTime && currentTime < tenderClosingTime)) {
		return next(new AppError('Can not participate in tender bidding.', 400));
	}
	
	const user = await User.findByPk(req.body.userId);
	if (![constants.userTypes.CONSULTANT, constants.userTypes.CONTRACTOR, constants.userTypes.SUPPLIER].includes(user.type)) {
		return next(new AppError("You don't have permission to perform this actions", 403));
	}

	const lastTenMinutes = moment(tenderClosingTime).subtract(10, 'minutes');

	if (moment(lastTenMinutes).isSameOrAfter(currentTime)) 
	{
		const scheduleEmailDate = new Date(lastTenMinutes);
		schedule.scheduleJob(scheduleEmailDate, async function() {
			console.log(`Sending email at ${moment(scheduleEmailDate).format('M/D/YYYY, H:mm:ss')} to user ${user.name.toUpperCase()}`);

			const emailOptions = {
				email: user.email,
				subject: 'Bidding Time Arrived',
				html:  `
					<h2>Hi, ${user.name}</h2>
					<p>Please submit your bidding info</p>
				</div>`
			};
		
			await sendEmail(emailOptions);
		}.bind(null, user));

		const emailOptions = {
			email: user.email,
			subject: 'Bidding Participation',
			html:  `
				<h2>Hi, ${user.name}</h2>
				<p>Thanks for participating in the bidding, you will notified using email and SMS when bidding time arrives</p>
			</div>`
		};
	
		await sendEmail(emailOptions);

		const { tenderId, userId} = req.body;

		const bid = await Bidding.create({ 
			tenderId, userId
		});
	
		res.status(201).json({
			status: 'success',
			data: {
				bid
			}
		});
	}
	else {
		const { tenderId, userId, durationInLetters, durationInNumbers, priceInLetters, priceInNumbers } = req.body;
		
		let status = 'Not_Qualified';
		if (priceInNumbers >= tender.minimumPrice && priceInNumbers <= tender.maximumPrice) {
			status = 'Qualified';
		}

		const bid = await Bidding.create({ 
			tenderId, 
			userId, 
			durationInLetters, 
			durationInNumbers, 
			priceInLetters, 
			priceInNumbers,
			status
		});
	
		res.status(201).json({
			status: 'success',
			data: {
				bid
			}
		});
	}
});

exports.updateBid = catchAsync(async (req, res, next) => {
	const biddingId = req.params.id;

	const bidding = await Bidding.findByPk(biddingId);
	if (!bidding) return next(new AppError('Could not find bid with the given Id', 404));

	const tender = await Tender.findByPk(bidding.dataValues.tenderId);
	if (!tender) return next(new AppError('Could not find bid with the given Id', 404));

	let status = 'Not_Qualified';
	if (req.body.priceInNumbers > tender.minimumPrice && req.body.priceInNumbers < tender.maximumPrice) {
		status = 'Qualified';
	}
	req.body.status = status;

	const bid = await Bidding.update(req.body, { where: { biddingId }});

	const emailOptions = {
		email: req.user.email,
		subject: 'Bid Placed',
		html:  `
			<h2>Hi, ${req.user.name}</h2>
			<p>Your bid has been submitted successfully</p>
		</div>`
	};

	await sendEmail(emailOptions);

	res.status(200).json({
		status: 'success',
		data: {
			bid
		}
	});
});

exports.deleteBid = catchAsync(async (req, res, next) => {
	const biddingId = req.params.id;
	const bid = await Bidding.destroy({ where: { biddingId }});

	if (!bid) return next(new AppError('No record found with given Id', 404));

	res.status(204).json({
		status: 'success',
		data: {
			bid
		}
	});
});