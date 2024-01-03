import ytdl from 'ytdl-core'


// Function to generate download link
export async function getDownloadLink(url) {
  try {
      let info = await ytdl.getInfo(url);
      let videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'audioandvideo' });
      const result = {
        downloadUrl: videoFormat.url,
        videoInfo: info
      }
      return result; 
  } catch(error) {
      console.error('Error', error);
      throw error; 
  }
}