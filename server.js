const app = require('./app');
const sequelize = require('./db');
const { checkTenderClosing } = require('./jobs');

// configure tables relationships
require('./migration.js')();


const port = process.env.PORT || 3000;
const server = app.listen(port, async () => {
    await sequelize.sync();

	console.log(`Server is listening on port ${port}`);
    console.log(`Connected to database ${process.env.DATABASE}`);

    await checkTenderClosing();
});

module.exports = server;