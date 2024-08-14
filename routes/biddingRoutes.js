const express = require('express');
const router = express.Router();
const biddingController = require('../controllers/biddingController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');

router.route('/tender/:id').get(biddingController.getBiddersByTenderId);
router.route('/getBidsByUser').get(auth, biddingController.getBidsByUserId);

router.route('/')
	.get(auth, restrictTo('Super_Admin', 'Admin', 'Employee'), biddingController.getAllBids)
	.post(auth, restrictTo('Consultant', 'Contractor', 'Supplier'), biddingController.participateInBidding);

router.route('/:id')
	.patch(auth, restrictTo('Consultant', 'Contractor', 'Supplier', 'Super_Admin', 'Admin'), biddingController.updateBid)
	.delete(auth, restrictTo('Super_Admin', 'Admin'), biddingController.deleteBid)

module.exports = router;