const uploadButton = document.getElementById('upload-button');
const audioFileInput = document.getElementById('audio-file');
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const pauseButton = document.getElementById('pauseButton');
const responseDiv = document.getElementById('response');
const metadataDisplay = document.getElementById('metadata-display');

let gumStream; // Stream from getUserMedia()
let rec; // Recorder.js object
let input; // MediaStreamAudioSourceNode

let audioContext; // AudioContext for recording

// Initialize or resume AudioContext
function startAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      console.log('AudioContext resumed');
    });
  }
}

// Function to create a download link
function createDownloadLink(blob, filename = 'audio.wav') {
  if (!(blob instanceof Blob)) {
    console.error('Invalid blob object:', blob);
    return null;
  }

  const audioUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = audioUrl;
  downloadLink.download = filename;
  downloadLink.textContent = `Download ${filename}`;
  downloadLink.style.display = 'block';
  return downloadLink;
}

// Function to fetch metadata from the text file
async function fetchMetadata() {
  try {
    const response = await fetch('/metadata.txt'); // Path to the metadata file
    if (!response.ok) {
      throw new Error('Failed to fetch metadata');
    }
    const text = await response.text();
    return text.split('\n').map(line => {
      const [audioname, format, compression] = line.split(';');
      return { audioname, format, compression };
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return [];
  }
}

// Function to display metadata
function displayMetadata(files, metadata) {
  metadataDisplay.innerHTML = ''; // Clear previous metadata

  files.forEach(file => {
    const fileName = file.name;
    const fileMetadata = metadata.find(m => m.audioname === fileName);

    if (fileMetadata) {
      const metadataDiv = document.createElement('div');
      metadataDiv.innerHTML = `
        <p><strong>File:</strong> ${fileMetadata.audioname}</p>
        <p><strong>Format:</strong> ${fileMetadata.format}</p>
        <p><strong>Compression:</strong> ${fileMetadata.compression}</p>
        <hr>
      `;
      metadataDisplay.appendChild(metadataDiv);
    } else {
      const metadataDiv = document.createElement('div');
      metadataDiv.innerHTML = `
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Metadata not found</strong></p>
        <hr>
      `;
      metadataDisplay.appendChild(metadataDiv);
    }
  });
}

// Function to upload and analyze audio files
async function uploadAudio(files) {
  if (!files || files.length === 0) {
    alert('Please select or record files first!');
    return;
  }

  // Convert FileList to an array
  const filesArray = Array.from(files);

  const formData = new FormData();
  for (let i = 0; i < filesArray.length; i++) {
    formData.append('files', filesArray[i]);
  }

  responseDiv.textContent = 'Uploading and analyzing audio...';

  try {
    // Fetch metadata
    const metadata = await fetchMetadata();

    // Display metadata
    displayMetadata(filesArray, metadata);

    // Send files to the backend API
    const response = await fetch('http://127.0.0.1:8000/predict/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Server error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    responseDiv.innerHTML = ''; // Clear previous responses

    data.forEach((result, index) => {
      const resultDiv = document.createElement('div');
      resultDiv.innerHTML = `File: <b>${result.filename}</b>, Label: <b>${result.label}</b>, Confidence: <b>${result.confidence}</b>`;
      responseDiv.appendChild(resultDiv);

      // Add download link for the uploaded file
      if (filesArray[index] instanceof Blob) {
        const downloadLink = createDownloadLink(filesArray[index], `uploaded-audio-${index}.wav`);
        if (downloadLink) {
          responseDiv.appendChild(downloadLink);
        }
      } else {
        console.warn('File is not a Blob:', filesArray[index]);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    responseDiv.textContent = 'Error: ' + error.message;
  }
}
// Event listener for file upload
uploadButton.addEventListener('click', () => {
  const files = audioFileInput.files;
  if (!files || files.length === 0) {
    alert('Please select files first!');
    return;
  }
  uploadAudio(files);
});

// Start Recording
recordButton.addEventListener('click', async () => {
  startAudioContext();

  const constraints = { audio: true, video: false };

  try {
    gumStream = await navigator.mediaDevices.getUserMedia(constraints);
    input = audioContext.createMediaStreamSource(gumStream);
    rec = new Recorder(input, { numChannels: 1 });
    rec.record();

    recordButton.disabled = true;
    stopButton.disabled = false;
    pauseButton.disabled = false;
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Error accessing microphone: ' + error.message);
  }
});

// Stop Recording
stopButton.addEventListener('click', () => {
  stopRecording();
});

// Pause Recording
pauseButton.addEventListener('click', () => {
  if (rec.recording) {
    rec.stop();
    pauseButton.textContent = 'Resume';
  } else {
    rec.record();
    pauseButton.textContent = 'Pause';
  }
});

// Function to stop recording and process the audio
function stopRecording() {
  stopButton.disabled = true;
  recordButton.disabled = false;
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';

  rec.stop();
  gumStream.getAudioTracks()[0].stop();

  rec.exportWAV(async (blob) => {
    if (blob.size === 0) {
      console.error('The audio file is empty.');
      responseDiv.textContent = 'Error: The audio file is empty.';
      return;
    }

    try {
      const downloadLink = createDownloadLink(blob, 'recorded-audio.wav');
      responseDiv.innerHTML = '';
      if (downloadLink) {
        responseDiv.appendChild(downloadLink);
      }

      await uploadAudio([blob]);
    } catch (error) {
      console.error('Error processing audio:', error);
      responseDiv.textContent = 'Error: ' + error.message;
    }
  });
}