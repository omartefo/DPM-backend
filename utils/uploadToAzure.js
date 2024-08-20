const fs = require('fs');
const { BlobServiceClient } = require("@azure/storage-blob");

const getBlobName = (originalName, folderName) => {
	const identifier = Math.random().toString().replace(/0\./, ''); // remove "0." from start of string
	return folderName ? `${folderName}/${identifier}-${originalName}` : `${identifier}-${originalName}`;
};

const uploadToBlob = (file, folderName) =>
 	new Promise((resolve, reject) => {
		const
			blobName = getBlobName(file.originalname, folderName)
			, containerName = process.env.AZURE_STORAGE_CONTAINER_NAME
			, blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
			, containerClient = blobServiceClient.getContainerClient(containerName)
			, blockBlobClient = containerClient.getBlockBlobClient(blobName)
		;

		blockBlobClient.uploadFile(file.path)
            .then(() => 
            {
                fs.unlinkSync(file.path);
                resolve(containerClient.getBlockBlobClient(blobName).url);
            }
            ).catch((err) => {
                if (err) reject(err);
            });
});

module.exports = uploadToBlob;
