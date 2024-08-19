const express = require('express');
const router = express.Router();
const biddingController = require('../controllers/biddingController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');
const constants = require('../utils/constants');

router.route('/tender/:id').get(biddingController.getBiddersByTenderId);
router.route('/getBidsByUser').get(auth, biddingController.getBidsByUserId);

router.route('/')
	.get(
		auth, 
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN, constants.userTypes.EMPLOYEE), 
		biddingController.getAllBids
	)
	.post(
		auth,
		restrictTo(constants.userTypes.CONSULTANT, constants.userTypes.CONTRACTOR, constants.userTypes.SUPPLIER),
		biddingController.participateInBidding
	);

router.route('/:id')
	.patch(
		auth,
		restrictTo(
			constants.userTypes.SUPER_ADMIN, 
			constants.userTypes.ADMIN,
			constants.userTypes.CONSULTANT,
			constants.userTypes.CONTRACTOR,
			constants.userTypes.SUPPLIER
		),
		biddingController.updateBid
	)
	.delete(
		auth, 
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN), 
		biddingController.deleteBid
	)

module.exports = router;