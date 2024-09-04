
// Load environment variables at the very beginning
const dotEnv = require('dotenv');
dotEnv.config({ path: 'config.env' });

const bcrypt = require('bcrypt');
const constants = require('./utils/constants');
const { User } = require('./models/userModel');
const { Project } = require('./models/projectsModel');

require('./migration')();

initializeModels = async () => {
    const sequelize = require('./db');
    await sequelize.sync();
}

createSuperAdmin = async () => {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(process.env.USER_PASSWORD, salt);

    const user = { 
        name: 'Farid Super Admin', 
        email: process.env.ADMIN_EMAIL,
        password: encryptedPassword,
        mobileNumber: process.env.ADMIN_MOBILE_NUMBER,
        isAccountActive: true,
        isEmailVerified: true,
        type: constants.userTypes.SUPER_ADMIN
    };

    await User.create(user);
}

createClient = async () => {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(process.env.USER_PASSWORD, salt);

    const user = { 
        name: 'Farid Client', 
        email: 'faridclient@gmail.com',
        password: encryptedPassword,
        mobileNumber: '12345676',
        isAccountActive: true,
        isEmailVerified: true,
        type: constants.userTypes.CLIENT
    };

    const record = await User.create(user);
    return record.userId;
}

createProject = async (clientId) => {
    const project = { 
        name: 'Project 1', 
        location: 'Doha',
        description: 'This is a dummy project for seed purpose.',
        type: 'Villa',
        isApproved: true,
        clientId
    };

    await Project.create(project);
}

initData = async () => {
    await initializeModels();

    await createSuperAdmin();
    console.log('Super admin created...');

    const clientId = await createClient();
    console.log("Client account created");

    await createProject(clientId);
    console.log("Project is created");
}

initData();