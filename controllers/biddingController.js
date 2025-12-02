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
const { sendEmail, getBiddingStatus } = require("../utils/helpers");
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

	const bids = await Bidding.findAndCountAll({
		limit,
		offset,
		attributes: ['biddingId', 'priceInNumbers', 'status', 'stage'],
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
		attributes: ['biddingId', 'priceInNumbers', 'stage']
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

	const { tenderId, durationInLetters, durationInNumbers, priceInLetters, priceInNumbers } = req.body;
	const loggedInUserId = req.user.userId;
	const user = await User.findByPk(loggedInUserId, { attributes: ['userId', 'name', 'email', 'type', 'canParticipateInTenders'] });

	if (user.type === constants.userTypes.CONTRACTOR && !user?.canParticipateInTenders) {
		return next(new AppError("You don't have permission to perform this actions", 403));
	}

	const tender = await Tender.findByPk(tenderId, { 
		attributes: ['tenderId', 'openingDate', 'closingDate', 'minimumPrice', 'maximumPrice'] 
	});
	if (!tender) return next(new AppError('Could not found tender with the given Id', 404));

	const { openingDate, closingDate, minimumPrice, maximumPrice } = tender;

	// Check tender's opening and closing dates
	const currentTime = new Date().getTime();
	const tenderOpeningTime = new Date(openingDate).getTime();
	const tenderClosingTime = new Date(closingDate).getTime();

	if (!(currentTime > tenderOpeningTime && currentTime < tenderClosingTime)) {
		return next(new AppError('You can not participate in tender bidding', 400));
	}

	const lastTenMinutes = moment(tenderClosingTime).subtract(10, 'minutes');
	let bid;

	if (moment(lastTenMinutes).isSameOrAfter(currentTime)) 
	{
		await scheduleBiddingArrivalEmail(lastTenMinutes, user);
		await sendBidParticipationEmail(user);
		bid = await Bidding.create({ tenderId, userId: loggedInUserId });
	}
	else {
		bid = await Bidding.create({ 
			tenderId,
			userId: loggedInUserId,
			durationInLetters,
			durationInNumbers,
			priceInLetters,
			priceInNumbers,
			status: getBiddingStatus(minimumPrice, maximumPrice, priceInNumbers)
		});
	}

	res.status(201).json({
		status: 'success',
		data: {
			bid
		}
	});
});

exports.updateBid = catchAsync(async (req, res, next) => {
	const biddingId = req.params.id;
	const bidding = await Bidding.findByPk(biddingId, { attributes: ['biddingId', 'tenderId'] });
	if (!bidding) return next(new AppError('Could not find bid with the given Id', 404));

	const tender = await Tender.findByPk(bidding.tenderId, { attributes: ['tenderId', 'minimumPrice', 'maximumPrice'] });
	if (!tender) return next(new AppError('Could not find bid with the given Id', 404));

	const { durationInLetters, durationInNumbers, priceInLetters, priceInNumbers } = req.body;
	const { minimumPrice, maximumPrice } = tender;
	
	const biddingInfo = {
		status: getBiddingStatus(minimumPrice, maximumPrice, priceInNumbers),
		durationInLetters,
		durationInNumbers,
		priceInLetters,
		priceInNumbers
	};

	const bid = await Bidding.update(biddingInfo, { where: { biddingId }});
	await sendBidPlacedEmail(req.user);

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

async function scheduleBiddingArrivalEmail(lastTenMinutes, user) {
	try {
		const { name, email } = user;
		const scheduleEmailDate = new Date(lastTenMinutes);

		schedule.scheduleJob(scheduleEmailDate, async function() {
			console.log(`Sending email at ${moment(scheduleEmailDate).format('M/D/YYYY, H:mm:ss')} to user ${name.toUpperCase()}`);

			const emailOptions = {
				email,
				subject: 'Bidding Time Arrived',
				html: `<div>
					<h2>Hi, ${name}</h2>
					<p>Please submit your bidding info</p>
				</div>`
			};
		
			await sendEmail(emailOptions);
		});
	}
	catch(error) {
		throw error;
	}
}

async function sendBidParticipationEmail(user) {
	try {
		const { email, name } = user;

		const emailOptions = {
			email,
			subject: 'Bidding Participation',
			html: `<div>
				<h2>Hi, ${name}</h2>
				<p>Thanks for participating in the bidding, you will notified using email and SMS when bidding time arrives</p>
			</div>`
		};

		await sendEmail(emailOptions);
	}
	catch(error) {
		throw error;
	}
}

async function sendBidPlacedEmail(user) {
	try {
		const { name, email } = user;

		const emailOptions = {
			email,
			subject: 'Bid Placed',
			html:  `
				<h2>Hi, ${name}</h2>
				<p>Your bid has been submitted successfully</p>
			</div>`
		};

		await sendEmail(emailOptions);
	}
	catch(error) {
		throw error;
	}
}