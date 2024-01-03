import express, { json } from 'express';
import cors from 'cors'; 
import { getDownloadLink } from './utils.js'


// Create express web server
const app = express();


// CORS options to allow GET and POST requests from youtube.com domain
const corsOptions = {
	origin: '*',
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Length','Accept-Ranges','Origin', 'Content-Type', 'Content-Disposition'],
};


// Apply CORS option to the express app
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	next();
});


// Use the CORS options for all routes
app.use(cors(corsOptions));


// Allow express to parse JSON
app.use(json());


// Endpoint to generate the download link
app.post('/getLink', cors(corsOptions), async(req,res) => {


	// Get the data from client request
	const data = req.body
	console.log(data); 


	// Extract the youtube video URL from data object 
	const youtubeLink = data['link']; 
	console.log(youtubeLink); 


	// Extract the download link for the youtube video URL 
	const info = await getDownloadLink(youtubeLink);
	

	// Grab download link and youtube video title
	const downloadLink = info['downloadUrl'];	
	const videoTitle = info['videoInfo'].player_response.videoDetails.title; 
	

	// Send download link to the client (Chrome extension)
	res.status(200).json({
		downloadLink: `${downloadLink}`,
		videoTitle: `${videoTitle}`
	});
}); 


// Define port to listen on. Default port is 8080. 
const port = process.env.PORT || 3000;


// Listen on defined port 
app.listen(port, function () {
	console.log('Server running at http://127.0.0.1:' + port + '/');
});