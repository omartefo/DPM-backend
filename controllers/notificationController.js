// Models
const { UserNotification, validate } = require('../models/notificationModel');

// Utils
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllNotifications = catchAsync(async (req, res, next) => {
	const user = req.user;
	const search = req.query;

	const page = +req.query.page || 1;
	const limit = +req.query.limit || 10;

	let where = {};

	for (let key in search) {
		if (key === 'page' || key === 'limit') continue;

		where[key] = search[key];
	}

	const offset = (page - 1) * limit;

	if (!['Super_Admin', 'Admin', 'Employee'].includes(user.type)) {
		where.userId = user.userId;
	}

	const notifications = await UserNotification.findAndCountAll({ where, offset, limit });

	res.status(200).json({
		status: 'success',
		data: {
			notifications
		}
	});
});

exports.createNotification = catchAsync(async (req, res, next) => {
	const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	const {userId, type, content } = req.body;
	const notification = await UserNotification.create({ userId, type, content, senderId: req.user.userId });
	
	res.status(201).json({
		status: 'success',
		data: {
			notification
		}
	});
});
