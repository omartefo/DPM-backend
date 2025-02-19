const constants = {
    userTypes: {
        CLIENT: 'Client',
        CONSULTANT: 'Consultant',
        SUPPLIER: 'Supplier',
        CONTRACTOR: 'Contractor',
        SUPER_ADMIN: 'Super_Admin',
        ADMIN: 'Admin',
        EMPLOYEE: 'Employee',
    },
    tenderStatuses: {
        OPEN: 'Open',
        UNDER_EVALUATION: 'Under Evaluation',
        AWARDED: 'Awarded'
    },
    biddingStatuses: {
        IN_RANGE: 'In_Range',
        OUT_OF_RANGE: 'Out_Of_Range'
    },
    userConfig: {
        MOBILE_NUMBER_LENGTH: 8
    }
};

module.exports = constants;