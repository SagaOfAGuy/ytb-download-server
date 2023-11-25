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
              console.log('File download complete!'); 
              clearInterval(intervalId);
              resolve(true);
            } else {
              logger.info(`File size for ${filePath}`, currentSize);
              console.log(`File size for ${filePath}`, currentSize); 
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

// Function to generate random file name
function randomFileName() {
  return crypto.randomBytes(32).toString('hex');
}

// Function to read file buffer
async function readFileToBuffer(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (err) {
    throw err;
  }
}



module.exports ={
  waitForFile,
  randomFileName,
  readFileToBuffer
}