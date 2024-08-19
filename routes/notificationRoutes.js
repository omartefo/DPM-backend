const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');
const constants = require('../utils/constants');

router.route('/')
	.get(auth, notificationController.getAllNotifications)
	.post(
		auth,
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN),
		notificationController.createNotification
	);

module.exports = router;