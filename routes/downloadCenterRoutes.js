const express = require('express');
const router = express.Router();
const downloadCenterController = require('../controllers/downloadCenterController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');
const constants = require('../utils/constants');

router.route('/')
	.get(auth, downloadCenterController.getAllDownloads)
	.post(
		auth, 
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN), 
		downloadCenterController.uploadDocs, 
		downloadCenterController.createDownloadItem
	);

router.use(auth, restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN));

router.route('/:id')
	.get(downloadCenterController.getDownloadItem)
	.patch(downloadCenterController.updateDownloadItem)
	.delete(downloadCenterController.deleteDownloadItem)

module.exports = router;