const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https'); 
const ytdl = require('ytdl-core');
const { format, createLogger, transports } = require('winston');  
const { combine, timestamp, label, printf } = format;
const CATEGORY = "winston custom format";
const bodyParser = require('body-parser');  
const cors = require('cors'); 
const path = require('path');
const compression = require('compression'); 

//Using the printf format.
const customFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

// Logging mechanism
const logger = createLogger({
	level: 'info',
	format: combine(label({ label: CATEGORY }), timestamp(), customFormat),
	defaultMeta: { service: 'user-service' },
	transports: [
	  //
	  // - Write all logs with importance level of `error` or less to `error.log`
	  // - Write all logs with importance level of `info` or less to `combined.log`
	  //
	  new transports.File({ filename: 'error.log', level: 'error' }),
	  new transports.File({ filename: 'combined.log' , level: 'debug'}),
	],
});

// Fundtion to wait until video file has finished downloading. Give it an hour timeout and check every second. 
async function waitForFile(filePath, pollingInterval = 1000, timeout = 600000) {
	let elapsedTime = 0;
	let previousSize = -1;
	return new Promise((resolve, reject) => {
	  const intervalId = setInterval(async () => {
		try {
		  const stats = await fs.promises.stat(filePath);
		  const currentSize = stats.size;
  
		  if (currentSize === previousSize && currentSize > 0) {
			// File size hasn't changed, and it's not an empty file, assuming download is complete
			logger.info('File download complete!');
			clearInterval(intervalId);
			resolve(true);
		  } else {
			logger.info('File size:', currentSize);
			previousSize = currentSize;
  
			// Check for timeout
			elapsedTime += pollingInterval;
			if (elapsedTime >= timeout) {
			  console.log('File download timeout!');
			  clearInterval(intervalId);
			  resolve(false);
			}
		  }
		} catch (error) {
		  // Handle errors (e.g., file does not exist)
		  console.error('Error:', error);
		  clearInterval(intervalId);
		  resolve(false);
		}
	  }, pollingInterval);
	});
  }

// Serve the contents in the 'public' directory to the internet
app.use(express.static(__dirname + '/public')); 
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
app.use(express.json());
app.options('/download/mp4/:filename', cors(corsOptions)); 

// Directory where MP4 while be downloaded to
const mp4FilesDirectory = path.join(__dirname, '/public'); 

// Listen for POST request
app.post('/url',async(req,res) => {
	try {
        // Grab request body
		const data = req.body;
		// Grab youtube link from client POST request
		const youtubeLink = data['youtubeLink']; 
		// Log the YouTube link
		logger.info(youtubeLink);
		// Get YouTube video information
		const videoInfo = await ytdl.getInfo(youtubeLink);  
		// Get the YouTube video title. Remove special characters from title
		const videoTitle = videoInfo.player_response.videoDetails.title.replaceAll(/[^a-zA-Z0-9]/g, '');
		// Log the YouTube title 
		logger.info(`${videoTitle}.mp4`); 
		// Create filepath to download youtube video
		const filePath = __dirname + `/public/${videoTitle}.mp4`;
		// Download YouTube video
		ytdl(youtubeLink, {filter: 'audioandvideo' }).pipe(fs.createWriteStream(filePath));
		// Wait until file is downloaded every second
		const file = await waitForFile(filePath, 1000);
		// If file is downloaded, send client video title
		console.log(file); 
		if(file == true) {
			res.status(200).json({encodedTitle: `${videoTitle}.mp4`});
		}	
      } catch (error) {
        console.error('Error parsing JSON:', error);
        res.status(400).send('Invalid JSON');
    }
});

// Route for clients to download youtube videos
app.get('/download/mp4/:filename', cors(corsOptions), (req,res) => {
	const filename = req.params.filename;
	const filepath = path.join(mp4FilesDirectory, filename); 
	// Set headers for response
	res.setHeader('Content-Type', 'video/mp4');
	res.setHeader('Content-Disposition',`attachment; filename=${filename}`);
	// Send video MP4 to client but delete when file has been downloaded by client
	res.sendFile(filepath, (err) => {
		if(err) {
			console.error('Error:', err);
			res.status(500).send('Internal Server Error'); 
		} else {
			fs.unlink(filepath, (deleteErr) => {
				if(deleteErr) {
					console.error(`Error deleting file ${deleteErr}`);
				} else {
					logger.info(`File ${filename} has been deleted`); 
				}
			});
		}
	}); 
});

// Define port to listen on. Default port is 8080. 
const port = process.env.PORT || 3000;
// Listen on defined port 
app.listen(port, function () {
	console.log('Server running at http://127.0.0.1:' + port + '/');
});
