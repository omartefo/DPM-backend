// 3rd party packages
const multer = require('multer');

// Models
const { DownloadCenter, validate } = require('../models/downloadCenterModel');
const { User } = require('../models/userModel');

// Utils
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const uploadToBlob = require('../utils/uploadToAzure');

const upload = multer({
	dest: 'temp/'
});

exports.uploadDocs = upload.array('documents', 10);

exports.getAllDownloads = catchAsync(async (req, res, next) => {
	const page = +req.query.page || 1;
	const limit = +req.query.limit || 10;
	const offset = (page - 1) * limit;

	const downloads = await DownloadCenter.findAndCountAll({
		limit,
		offset,
		include: [
			{
				model: User, attributes: ['userId', 'name'],
			}
		],
		order: [['createdAt', 'DESC']],
	});

	res.status(200).json({
		status: 'success',
		data: {
			downloads
		}
	});
});

exports.getDownloadItem = catchAsync(async (req, res, next) => {
	const downloadId = req.params.id;
	const downloadItem = await DownloadCenter.findByPk(downloadId);

	if (!downloadItem) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			downloadItem
		}
	});
});

exports.createDownloadItem = catchAsync(async (req, res, next) => {
	const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	if (req.files) {
		const promises = [];
		req.files.forEach(file => promises.push(uploadToBlob(file)))
		req.body.documents = await Promise.all(promises);
	}

	const { description, documents } = req.body;

	const downloadCenterItem = await DownloadCenter.create({ 
		description,
		documents,
		uploadedBy: req.user.userId
	});
	
	res.status(201).json({
		status: 'success',
		data: {
			downloadCenterItem
		}
	});
});

exports.updateDownloadItem = catchAsync(async (req, res, next) => {
	const downloadId = req.params.id;
	const downloadItem = await DownloadCenter.update(req.body, { where: { downloadId }});

	if (!downloadItem) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			downloadItem
		}
	});
});

exports.deleteDownloadItem = catchAsync(async (req, res, next) => {
	const downloadId = req.params.id;
	const downloadItem = await DownloadCenter.destroy({ where: { downloadId }});

	if (!downloadItem) return next(new AppError('No record found with given Id', 404));

	res.status(204).json({
		status: 'success',
		data: {
			downloadItem
		}
	});
});