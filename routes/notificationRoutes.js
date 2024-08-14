const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');

router.route('/')
	.get(auth, notificationController.getAllNotifications)
	.post(auth, restrictTo('Super_Admin', 'Admin'), notificationController.createNotification);

module.exports = router;