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

const deleteBlob = async (blobName) => {
	try {		
		// include: Delete the base blob and all of its snapshots.
		// only: Delete only the blob's snapshots and not the blob itself.
		const options = {
			deleteSnapshots: 'include' // or 'only'
		}

		const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
		const containerClient = await blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);

		// Create blob client from container client
		const blockBlobClient = await containerClient.getBlockBlobClient(blobName);

		// Delete blob with options
		await blockBlobClient.delete(options);
	} catch (error) {
		console.error(`Failed to delete blob ${blobName}: ${error.message}`);
		throw error;
	}
};

exports.uploadToBlob = uploadToBlob;
exports.deleteBlob = deleteBlob;