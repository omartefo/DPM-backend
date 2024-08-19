const express = require('express');
const router = express.Router();
const otpCodeController = require('../controllers/otpCodeController');

router.route('/getOTPCode').post(otpCodeController.getOTPCode);
router.route('/verifyOTPCode').post(otpCodeController.verifyOTPCode);

module.exports = router;
