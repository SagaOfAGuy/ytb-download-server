import * as fs from 'fs';

// Fundtion to wait until video file has finished downloading. Give it an hour timeout and check every second. 
export async function waitForFile(filePath, pollingInterval = 1000, timeout = 600000) {
      let elapsedTime = 0;
      let previousSize = -1;
      return new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
          try {
            const stats = await fs.promises.stat(filePath);
            const currentSize = stats.size;
    
            if (currentSize === previousSize && currentSize > 0) {
              // File size hasn't changed, and it's not an empty file, assuming download is complete
              console.log('File download complete!'); 
              clearInterval(intervalId);
              resolve(true);
            } else {
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


// Function to read file buffer
export async function readFileToBuffer(filePath) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer;
  } catch (err) {
    throw err;
  }
}