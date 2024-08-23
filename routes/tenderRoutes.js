const express = require('express');
const router = express.Router();
const tenderControler = require('../controllers/tenderController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');
const constants = require('../utils/constants');

router.use(auth);

router.route('/:id/bids').get(tenderControler.tenderBids);

router.route('/:id/awardTender').patch(
	restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN), 
	tenderControler.awardTender
);
router.route('/:id/unAwardTender').patch(
	restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN), 
	tenderControler.unAwardTender
);
router.route('/:id/changeStatus').patch(
	restrictTo(constants.userTypes.SUPER_ADMIN), 
	tenderControler.changeTenderStatus
);

router.route('/')
	.get(tenderControler.getAllTenders)
	.post(
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN), 
		tenderControler.uploadDocs, 
		tenderControler.createTender
	);
	
router.route('/:id')
	.get(tenderControler.getTender)
	.patch(
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN),
		tenderControler.uploadDocs,
		tenderControler.updateTender
	)
	.delete(
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN),
		tenderControler.deleteTender
	)

module.exports = router;