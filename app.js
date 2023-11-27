import express, { json } from 'express';
import ytb from 'ytdl-core';
const { getInfo } = ytb;
import cors from 'cors'; 
import { join } from 'path';
import compression from 'compression'; 
import { waitForFile, readFileToBuffer } from './utils.js'; 
import { getSecret } from './s3.js'; 
import { PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer'; 
import * as fs from 'fs'; 

// Create the filepath variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Create express web server
const app = express();


// Use compression
app.use(compression())


// CORS options to allow GET and POST requests from youtube.com domain
const corsOptions = {
	origin: 'https://www.youtube.com',
	methods: ['GET', 'POST'],
	allowedHeaders: ['Content-Length','Accept-Ranges','Origin', 'Content-Type', 'Content-Disposition'],
};


// Use the CORS options for all routes
app.use(cors(corsOptions));


// Allow express to parse JSON
app.use(json());
//app.options('/download/mp4/:filename', cors(corsOptions)); 


// Directory where MP4 while be downloaded to
const mp4FilesDirectory = join(__dirname, '/public'); 


// Grab the Amazon secrets values we need to set in Amazon secrets manager
var access = JSON.parse(await getSecret('ytb-access-key','us-east-1'))['access']; 
var secret = JSON.parse(await getSecret('ytb-secret','us-east-1'))['secret'];
var bucket = JSON.parse(await getSecret('ytb-bucket', 'us-east-1'))['bucket']; 
var keyPairId = JSON.parse(await getSecret('ytb-download-keypair-id','us-east-1'))['keyid']; 
var cloudfrontDomain = JSON.parse(await getSecret('cloudfront-domain','us-east-1'))['domain'];
var region = 'us-east-1'
var privateKey = await getSecret('ytb-download-priv-key','us-east-1'); 


// Define s3 client with credentials
var s3 = new S3Client({
	region: region,
	credentials: {
		accessKeyId: access,
		secretAccessKey: secret
	}
});


// Listen for POST request
app.post('/url', cors(corsOptions), async(req,res) => {
	try {
        // Grab request body
		const data = req.body;


		// Grab youtube link from client POST request
		const youtubeLink = data['youtubeLink']; 


		// Log the YouTube link
		console.log(youtubeLink);


		// Get YouTube video information
		const videoInfo = await getInfo(youtubeLink);  


		// Get the YouTube video title. Remove special characters from title
		const videoTitle = videoInfo.player_response.videoDetails.title.replaceAll(/[^a-zA-Z0-9]/g, '');


		// Log the YouTube title 
		console.log(videoTitle); 


		// Create filepath to download youtube video
		const filePath = __dirname + `/public/${videoTitle}.mp4`;


		// Download YouTube video
		const downloadStream = ytb(youtubeLink, {highWaterMark: 256 * 1024 * 1024, quality: 'highestvideo', filter: 'audioandvideo' })
		const fileStream = fs.createWriteStream(filePath);
		downloadStream.pipe(fileStream); 


		// Wait until file is download to disk. Check every second
		const file = await waitForFile(filePath, 1000);


		// If file is downloaded
		console.log(file, typeof(file)); 
		if(file == true) {


			// Get the filebuffer for the downloaded mp4 file
			var fileBuffer = await readFileToBuffer(`${filePath}`); 


			// The PUT command we will send the s3 bucket
			const uploadCommand = new PutObjectCommand({
				Bucket: bucket,
				Key: `${videoTitle}`,
				Body: fileBuffer,
			}); 
			

			// Send the mp4 file to the s3 bucket
    		await s3.send(uploadCommand); 
			

			// Create CloudFront signed URL
			const cloudFrontUrl = getSignedUrl({
				url:`${cloudfrontDomain}/${videoTitle}`,
				dateLessThan: new Date(Date.now() + 1000 * 60 * 60),
				privateKey: privateKey,
				keyPairId: keyPairId
			})
			
			
			// If the video has been uploaded to S3 properly
			if(cloudFrontUrl.includes("https://")) {
				// Delete the youtube video from server storage
				fs.unlink(filePath, (deleteErr) => {
					if(deleteErr) {
						console.error(`Error deleting file ${deleteErr}`);
					} else {
						console.log(`File ${filePath} has been deleted from server`); 
					}
				});
			}


			// Share the CloudFront link and video title back to the client for download
			res.status(200).json({
				encodedTitle: `${videoTitle}`,
				cloudFrontSignedUrl: cloudFrontUrl
			});
		}	
      } catch (error) {
        console.error('Error parsing JSON:', error);
        res.status(400).send('Invalid JSON');
    }
});


// Route for when client clicks the "Download button"
app.post('/finished', cors(corsOptions), async(req,res) => {
	// Grab request body
	const data = req.body;


	// Grab download status and video filename from user
	const downloadStatus = data.data['downloadStatus'];
	const fileName = data.data['fileName'];


	// If download status is finished, delete the file inside of the S3 bucket
	if(downloadStatus == 'finished') {
		

		// The PUT command we will send the s3 bucket
		const deleteCommand = new DeleteObjectCommand({
			Bucket: bucket,
			Key: `${fileName}`,
		}); 


		// Delete file from S3 bucket
		await s3.send(deleteCommand); 
		console.log(`${fileName} deleted from bucket`); 
	}
}); 

// Define port to listen on. Default port is 8080. 
const port = process.env.PORT || 3000;


// Listen on defined port 
app.listen(port, function () {
	console.log('Server running at http://127.0.0.1:' + port + '/');
});