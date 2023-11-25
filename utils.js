import crypto from 'crypto'
// Functions for file handling and logging

//Using the printf format.
export const customFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});
  
// Logging mechanism
export const logger = createLogger({
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
export function randomFileName() {
  return crypto.randomBytes(32).toString('hex');
}