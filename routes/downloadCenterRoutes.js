const express = require('express');
const router = express.Router();
const downloadCenterController = require('../controllers/downloadCenterController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');

router.route('/')
	.get(auth, downloadCenterController.getAllDownloads)
	.post(auth, restrictTo('Super_Admin', 'Admin'), downloadCenterController.uploadDocs, downloadCenterController.createDownloadItem);

router.use(auth, restrictTo('Super_Admin', 'Admin'));

router.route('/:id')
	.get(downloadCenterController.getDownloadItem)
	.patch(downloadCenterController.updateDownloadItem)
	.delete(downloadCenterController.deleteDownloadItem)

module.exports = router;