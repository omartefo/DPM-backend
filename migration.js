// Models 
const { User } = require('./models/userModel');
const { Project } = require('./models/projectsModel');
const { Tender } = require('./models/tenderModel');
const { Bidding } = require('./models/biddingModel');
const { UserCompany } = require('./models/userCompanyModel');
const { DownloadCenter } = require('./models/downloadCenterModel');

module.exports = function() {
	UserCompany.hasOne(User, { constraints: true, onDelete: 'RESTRICT', foreignKey: 'companyId' });
	User.belongsTo(UserCompany, { foreignKey: 'companyId' })

	User.hasMany(Project, { constraints: true, onDelete: 'RESTRICT', foreignKey: 'clientId' });
	Project.belongsTo(User, { foreignKey: 'clientId' });

	Project.hasMany(Tender, { constraints: true, onDelete: 'RESTRICT', foreignKey: 'projectId' });
	Tender.belongsTo(Project, { foreignKey: 'projectId' });

	User.hasOne(Tender, { constraints: true, onDelete: 'RESTRICT', foreignKey: 'awardedTo' });
	Tender.belongsTo(User, { foreignKey: 'awardedTo' });

	User.hasMany(Bidding, { constraints: true, onDelete: 'RESTRICT', foreignKey: 'userId'});
	Bidding.belongsTo(User, { foreignKey: 'userId' });

	Tender.hasMany(Bidding, { constraints: true, onDelete: 'RESTRICT', foreignKey: 'tenderId'});
	Bidding.belongsTo(Tender, { foreignKey: 'tenderId' });

	User.hasMany(DownloadCenter, { constraints: true, onDelete: 'RESTRICT', foreignKey: 'uploadedBy' });
	DownloadCenter.belongsTo(User, { foreignKey: 'uploadedBy' });
}